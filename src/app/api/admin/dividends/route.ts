import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";

/**
 * Super-Admin-only endpoint to post (or reverse) a dividend payment for a
 * member. Positive amounts credit a dividend; negative amounts reverse or
 * correct a previously posted dividend.
 */
export async function POST(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor || actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can adjust member dividends" }, { status: 403 });

  try {
    const body = await request.json();
    const userId = String(body?.userId || "");
    const amount = Number(body?.amount);
    if (!userId || !Number.isFinite(amount) || amount === 0) return NextResponse.json({ error: "A member and a non-zero amount are required" }, { status: 400 });

    const member = await prisma.user.findUnique({ where: { id: userId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: "DIVIDEND",
          amount,
          reference: `DIV-${randomUUID()}`,
          description: String(body.reason || (amount > 0 ? "Dividend payout" : "Dividend correction")),
          actorId: actor.id,
        },
      });
      // Dividends go straight into the member's total savings.
      const current = await tx.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "SAVINGS", status: "POSTED", reversedAt: null } });
      const balanceAfter = Number(current._sum.amount || 0) + amount;
      if (balanceAfter < 0) throw new Error("A dividend reversal cannot exceed the member's current savings");
      await tx.transaction.create({ data: { userId, type: "SAVINGS", amount, reference: `SAV-DIV-${randomUUID()}`, description: amount > 0 ? "Dividend credited to savings" : "Dividend reversal from savings", balanceAfter, actorId: actor.id } });
      await tx.auditEntry.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: amount > 0 ? "DIVIDEND_POSTED" : "DIVIDEND_CORRECTED",
          entityType: "Transaction",
          entityId: transaction.id,
          newValue: String(amount),
          reason: String(body.reason || "Dividend adjustment"),
          transactionId: transaction.id,
        },
      });
      await tx.notification.create({ data: { userId, title: amount > 0 ? "Dividend paid" : "Dividend adjustment", body: `₦${Math.abs(amount).toLocaleString()} dividend ${amount > 0 ? "has been added to" : "was deducted from"} your total savings. Your new savings balance is ₦${balanceAfter.toLocaleString()}.` } });
      return transaction;
    });
    await sendPushNotification(userId, {
      title: amount > 0 ? "Dividend paid" : "Dividend adjustment",
      body: `₦${Math.abs(amount).toLocaleString()} dividend ${amount > 0 ? "has been added to" : "was deducted from"} your total savings.`,
    });

    return NextResponse.json({ transaction: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dividend adjustment failed" }, { status: 500 });
  }
}
