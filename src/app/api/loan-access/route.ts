import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getCategoryConfig } from "@/lib/membership";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["SUPER_ADMIN", "FINANCE_OFFICER"];

export async function GET(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(actor.role)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const memberships = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      user: { role: "MEMBER" },
      ...(search ? { OR: [{ membershipNo: { contains: search, mode: "insensitive" } }, { user: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } }] } : {}),
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { user: { createdAt: "desc" } },
  });

  const savings = await prisma.transaction.groupBy({
    by: ["userId"],
    _sum: { amount: true },
    where: { type: "SAVINGS", status: "POSTED", reversedAt: null, userId: { in: memberships.map((item) => item.userId) } },
  });
  const savingsByUser = new Map(savings.map((item) => [item.userId, Number(item._sum.amount || 0)]));

  const members = await Promise.all(memberships.map(async (item) => {
    const config = await getCategoryConfig(item.grade);
    const months = item.joinedAt ? Math.floor((Date.now() - item.joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)) : 0;
    const totalSavings = savingsByUser.get(item.userId) ?? 0;
    return {
      id: item.user.id,
      name: `${item.user.firstName} ${item.user.lastName}`,
      email: item.user.email,
      membershipNo: item.membershipNo,
      grade: item.grade,
      totalSavings,
      membershipMonths: months,
      qualified: months >= config.minMembershipMonths && totalSavings > 0,
      loanAccess: item.loanAccess,
      loanAccessReason: item.loanAccessReason,
      loanAccessUpdatedAt: item.loanAccessUpdatedAt,
    };
  }));

  return NextResponse.json({ members });
}

export async function PUT(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(actor.role)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { userId, action, reason } = await request.json().catch(() => ({}));
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (!userId || !["ACTIVATE", "DEACTIVATE", "OVERRIDE"].includes(action)) return NextResponse.json({ error: "A member and a valid action are required" }, { status: 400 });
  if (trimmedReason.length < 3) return NextResponse.json({ error: "A reason is required for this action" }, { status: 400 });
  if (action === "OVERRIDE" && actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can activate loans for a member who does not qualify" }, { status: 403 });

  const membership = await prisma.membership.findUnique({ where: { userId } });
  if (!membership) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const loanAccess = action === "DEACTIVATE" ? "DEACTIVATED" : action === "OVERRIDE" ? "OVERRIDE" : "AUTO";
  const label = action === "DEACTIVATE" ? "deactivated" : action === "OVERRIDE" ? "activated (eligibility override)" : "activated";
  await prisma.$transaction(async (tx) => {
    await tx.membership.update({ where: { userId }, data: { loanAccess, loanAccessReason: trimmedReason, loanAccessUpdatedBy: actor.id, loanAccessUpdatedAt: new Date() } });
    await tx.notification.create({ data: { userId, title: `Loan access ${label}`, body: `Your loan access has been ${label}. Reason: ${trimmedReason}` } });
    await tx.auditEntry.create({ data: { actorId: actor.id, action: `LOAN_ACCESS_${action}`, entityType: "Membership", entityId: membership.id, previousValue: membership.loanAccess, newValue: loanAccess, reason: trimmedReason } });
  });
  await sendPushNotification(userId, { title: `Loan access ${label}`, body: `Reason: ${trimmedReason}`, path: "/member" }).catch(() => undefined);

  return NextResponse.json({ message: `Loan access ${label}.`, loanAccess });
}
