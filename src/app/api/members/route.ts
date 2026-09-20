import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createUserLocal, findUserByEmailLocal, sanitizeUser } from "@/lib/store";
import { registrationSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  }

  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "EXECUTIVE") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (process.env.DATABASE_URL) {
    const members = await prisma.user.findMany({
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
              membershipNo: `CPYF-${Date.now()}`,
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
  if (!sessionUser || (sessionUser.role !== "ADMIN" && sessionUser.role !== "EXECUTIVE")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { userId, status } = await request.json();
    if (!userId || !["ACTIVE", "REJECTED", "SUSPENDED"].includes(status)) {
      return NextResponse.json({ error: "A valid userId and membership status are required" }, { status: 400 });
    }
    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { userId },
        data: { status, joinedAt: status === "ACTIVE" ? new Date() : undefined },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      });
      await tx.notification.create({ data: { userId, title: status === "ACTIVE" ? "Registration approved" : "Membership application update", body: status === "ACTIVE" ? "Your membership application has been approved." : `Your membership status is now ${status.toLowerCase()}.` } });
      return updated;
    });
    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Member status update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
