import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";

async function authorized(request: Request) {
  const user = await getUserFromRequest(request);
  return user && (user.role === "ADMIN" || user.role === "EXECUTIVE" ? user : user);
}

export async function GET(request: Request) {
  const user = await authorized(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const scopeAll = searchParams.get("scope") === "all";
  if (scopeAll && !can(user.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const userId = scopeAll ? undefined : user.id;

  const transactions = await prisma.transaction.findMany({
    where: { type: "SAVINGS", ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (scopeAll && searchParams.get("format") === "csv") {
    const header = "Date,Member,Description,Amount,Status,Balance\n";
    const rows = transactions.map((item) => `${item.createdAt.toISOString()},"${item.user.firstName} ${item.user.lastName}","${item.description.replaceAll('"', '""')}",${item.amount},${item.status},${item.balanceAfter ?? ""}`).join("\n");
    return new NextResponse(header + rows, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=savings-records.csv" } });
  }
  const posted = transactions.filter((item) => item.status === "POSTED" && !item.reversedAt);
  const total = posted.reduce((sum, item) => sum + item.amount, 0);
  return NextResponse.json({ totalSavings: total, transactions });
}

export async function POST(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor || !can(actor.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const body = await request.json();
    const userId = String(body?.userId || "");
    const amount = Number(body?.amount);
    if (!userId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Member and a positive amount are required" }, { status: 400 });
    const current = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "SAVINGS", status: "POSTED", reversedAt: null },
    });
    const balanceAfter = Number(current._sum.amount || 0) + amount;
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: "SAVINGS",
        amount,
        reference: `SAV-${randomUUID()}`,
        description: String(body.description || "Savings contribution"),
        balanceAfter,
        actorId: actor.id,
      },
    });
    await prisma.auditEntry.create({ data: { actorId: actor.id, action: "SAVINGS_POST", entityType: "Transaction", entityId: transaction.id, previousValue: String(current._sum.amount || 0), newValue: String(balanceAfter), reason: String(body.reason || body.description || "Savings posted"), transactionId: transaction.id } });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Savings entry failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor || !can(actor.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const { id } = await request.json();
    const original = await prisma.transaction.findUnique({ where: { id } });
    if (!original || original.type !== "SAVINGS") return NextResponse.json({ error: "Savings transaction not found" }, { status: 404 });
    if (original.reversedAt) return NextResponse.json({ error: "Transaction is already reversed" }, { status: 409 });
    const reversal = await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id }, data: { reversedAt: new Date(), status: "REVERSED", actorId: actor.id } });
      const current = await tx.transaction.aggregate({ _sum: { amount: true }, where: { userId: original.userId, type: "SAVINGS", status: "POSTED", reversedAt: null } });
      return tx.transaction.create({
        data: {
          userId: original.userId,
          type: "SAVINGS",
          amount: -original.amount,
          reference: `REV-${randomUUID()}`,
          description: `Reversal: ${original.description}`,
          balanceAfter: Number(current._sum.amount || 0) - original.amount,
          actorId: actor.id,
          reversalOf: original.id,
        },
      });
    });
    return NextResponse.json({ transaction: reversal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Savings reversal failed" }, { status: 500 });
  }
}
