import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { staffAccountSchema } from "@/lib/validation";

const STAFF_ROLES = ["EXECUTIVE", "ADMIN", "FINANCE_OFFICER", "LOAN_OFFICER", "MEMBERSHIP_OFFICER", "AUDITOR"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];
const STAFF_ROLE_SET: readonly string[] = STAFF_ROLES;

async function requireSuperAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

export async function GET(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({ error: "Only a Super Administrator can manage staff accounts" }, { status: 403 });

  const staff = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({ error: "Only a Super Administrator can create staff accounts" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = staffAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid staff account details", issues: parsed.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, role } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          passwordHash,
          role,
          createdBy: actor.id,
        },
      });
      await tx.auditEntry.create({
        data: {
          actorId: actor.id,
          action: "STAFF_ACCOUNT_CREATED",
          entityType: "User",
          entityId: created.id,
          newValue: role,
          reason: `${role.replace(/_/g, " ")} access created for ${firstName} ${lastName} (${email.toLowerCase()})`,
        },
      });
      return created;
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create staff account" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({ error: "Only a Super Administrator can update staff accounts" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "A staff account id is required" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: body.id } });
    if (!target || !STAFF_ROLE_SET.includes(target.role)) {
      return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
    }
    if (target.id === actor.id) {
      return NextResponse.json({ error: "You cannot manage your own account from this screen" }, { status: 400 });
    }

    const data: { role?: StaffRole; isActive?: boolean; passwordHash?: string } = {};
    const changes: string[] = [];

    if (typeof body.role === "string" && body.role !== target.role) {
      if (!STAFF_ROLE_SET.includes(body.role)) {
        return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
      }
      data.role = body.role as StaffRole;
      changes.push(`role: ${target.role} -> ${body.role}`);
    }

    if (typeof body.isActive === "boolean" && body.isActive !== target.isActive) {
      data.isActive = body.isActive;
      changes.push(`status: ${target.isActive ? "ACTIVE" : "SUSPENDED"} -> ${body.isActive ? "ACTIVE" : "SUSPENDED"}`);
    }

    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      data.passwordHash = await hash(body.password, 12);
      changes.push("password reset");
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No changes were provided" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({ where: { id: target.id }, data });
      await tx.auditEntry.create({
        data: {
          actorId: actor.id,
          action: "STAFF_ACCOUNT_UPDATED",
          entityType: "User",
          entityId: target.id,
          previousValue: target.role,
          newValue: result.role,
          reason: changes.join("; ") || "Staff account updated",
        },
      });
      return result;
    });

    const { passwordHash: _passwordHash, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update staff account" }, { status: 500 });
  }
}
