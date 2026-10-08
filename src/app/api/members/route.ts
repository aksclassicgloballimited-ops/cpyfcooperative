import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createUserLocal, findUserByEmailLocal, sanitizeUser } from "@/lib/store";
import { registrationSchema } from "@/lib/validation";
import { can, canWrite } from "@/lib/permissions";
import { sendPushNotification } from "@/lib/push";

export async function GET(request: Request) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  }

  if (!can(sessionUser.role, "members")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (process.env.DATABASE_URL) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const grade = searchParams.get("grade");
    const category = searchParams.get("category");
    const id = searchParams.get("id");
    if (id && !["SUPER_ADMIN", "MEMBERSHIP_OFFICER"].includes(sessionUser.role)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    const members = await prisma.user.findMany({
      // Passwords are never returned; the heavy uploaded files are only returned for a single-member lookup.
      omit: { passwordHash: true, ...(id ? {} : { passportPhoto: true, identificationDocument: true }) },
      where: {
        ...(id ? { id } : {}),
        ...(sessionUser.role === "SUPER_ADMIN" ? {} : { role: "MEMBER" as const }),
        ...(search ? { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { membership: { membershipNo: { contains: search, mode: "insensitive" } } }] } : {}),
        ...(status || grade || category ? { membership: { ...(status ? { status: status as never } : {}), ...(grade ? { grade: grade as never } : {}), ...(category ? { category: category as never } : {}) } } : {}),
      },
      include: { membership: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ members }, { status: 200 });
  }

  return NextResponse.json({ members: [] }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration details", issues: parsed.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, category, weeklyTarget } = parsed.data;

    if (process.env.DATABASE_URL) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });

      const passwordHash = await hash(password, 12);
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          passwordHash,
          membership: {
            create: {
              category,
              // Membership numbers are assigned manually by the management on approval.
              weeklyTarget,
            },
          },
        },
        include: { membership: true },
      });

      return NextResponse.json(
        { id: user.id, email: user.email, membershipNo: user.membership?.membershipNo },
        { status: 201 },
      );
    }

    const existing = await findUserByEmailLocal(email);
    if (existing) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });

    const user = await createUserLocal({
      firstName,
      lastName,
      email,
      phone,
      password,
      category,
      weeklyTarget,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      membershipNo: user.membership?.membershipNo,
      user: sanitizeUser(user),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser || !canWrite(sessionUser.role, "members")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { userId, status, role, reason, grade, membershipNo: rawMembershipNo, ...profile } = await request.json();
    const membershipNo = typeof rawMembershipNo === "string" ? rawMembershipNo.trim() : "";
    if (!userId || (!status && !role && !membershipNo && !grade && !Object.keys(profile).length)) {
      return NextResponse.json({ error: "A valid userId and membership status are required" }, { status: 400 });
    }
    if (role && !["PRESIDENT", "EXECUTIVE", "SUPER_ADMIN", "FINANCE_OFFICER", "LOAN_OFFICER", "MEMBERSHIP_OFFICER", "AUDITOR", "MEMBER"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (role && sessionUser.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can change roles" }, { status: 403 });
    if (Object.keys(profile).length && sessionUser.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can correct member profile details" }, { status: 403 });
    if (grade && !["ACTIVE", "SILVER", "GOLDEN"].includes(grade)) return NextResponse.json({ error: "Invalid membership category" }, { status: 400 });
    if (grade && sessionUser.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can upgrade or change member categories" }, { status: 403 });
    const existingMembership = await prisma.membership.findUnique({ where: { userId }, select: { membershipNo: true, grade: true } });
    if (!existingMembership) return NextResponse.json({ error: "Membership record not found" }, { status: 404 });
    if (status === "ACTIVE" && !existingMembership.membershipNo && !membershipNo) return NextResponse.json({ error: "Enter a membership number to approve this member" }, { status: 400 });
    if (membershipNo) {
      // Anyone allowed to approve members may assign the first number; later edits are restricted.
      if (existingMembership.membershipNo && !["SUPER_ADMIN", "PRESIDENT", "MEMBERSHIP_OFFICER"].includes(sessionUser.role)) return NextResponse.json({ error: "Only a President or Membership Officer can edit membership numbers" }, { status: 403 });
      const taken = await prisma.membership.findFirst({ where: { membershipNo, NOT: { userId } } });
      if (taken) return NextResponse.json({ error: "That membership number is already in use" }, { status: 409 });
    }
    if (status && !["ACTIVE", "REJECTED", "SUSPENDED", "PENDING"].includes(status)) return NextResponse.json({ error: "Invalid membership status" }, { status: 400 });
    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({ where: { userId }, data: { ...(status ? { status, joinedAt: status === "ACTIVE" ? new Date() : undefined } : {}), ...(membershipNo ? { membershipNo } : {}), ...(grade ? { grade, gradeLocked: true } : {}) }, include: { user: { select: { firstName: true, lastName: true, email: true } } } });
      if (role || Object.keys(profile).length) await tx.user.update({ where: { id: userId }, data: { ...(role ? { role } : {}), ...Object.fromEntries(Object.entries(profile).filter(([key, value]) => ["firstName", "lastName", "email", "phone", "occupation", "incomeRange", "address"].includes(key) && typeof value === "string").map(([key, value]) => [key, key === "email" ? String(value).trim().toLowerCase() : String(value).trim()])) } });
      if (status) await tx.notification.create({ data: { userId, title: status === "ACTIVE" ? "Registration approved" : "Membership application update", body: status === "ACTIVE" ? `Your membership application has been approved.${updated.membershipNo ? ` Your membership number is ${updated.membershipNo}.` : ""}` : `Your membership status is now ${status.toLowerCase()}.` } });
      if (grade) await tx.notification.create({ data: { userId, title: "Membership category updated", body: `Your membership category is now ${grade.charAt(0)}${grade.slice(1).toLowerCase()}.` } });
      await tx.auditEntry.create({ data: { actorId: sessionUser.id, action: role ? "ROLE_CHANGE" : grade ? "MEMBER_GRADE_CHANGE" : membershipNo ? "MEMBERSHIP_NUMBER_CHANGE" : "MEMBERSHIP_UPDATE", entityType: "User", entityId: userId, previousValue: grade ? existingMembership.grade : undefined, newValue: JSON.stringify({ status, role, membershipNo, grade, profile }), reason: reason || "Member record updated" } });
      return updated;
    });
    if (status) {
      const title = status === "ACTIVE" ? "Registration approved" : "Membership application update";
      const body = status === "ACTIVE" ? `Your membership application has been approved.${member.membershipNo ? ` Your membership number is ${member.membershipNo}.` : ""}` : `Your membership status is now ${status.toLowerCase()}.`;
      await sendPushNotification(userId, { title, body });
    }
    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Member status update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser || sessionUser.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can delete members" }, { status: 403 });
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Member is required" }, { status: 400 });
  if (userId === sessionUser.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "MEMBER") return NextResponse.json({ error: "Member not found" }, { status: 404 });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: userId } });
      await tx.auditEntry.create({ data: { actorId: sessionUser.id, action: "MEMBER_DELETED", entityType: "User", entityId: userId, previousValue: target.email, newValue: "DELETED", reason: `Deleted member ${target.firstName} ${target.lastName} (${target.email})` } });
    });
    return NextResponse.json({ message: "Member deleted" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete member" }, { status: 500 });
  }
}