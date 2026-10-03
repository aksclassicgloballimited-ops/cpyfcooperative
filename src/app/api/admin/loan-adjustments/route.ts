import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Super-Admin-only endpoint to record a loan repayment or adjust a loan's
 * outstanding balance. Positive amounts record a repayment (reduces the
 * outstanding balance); negative amounts increase the outstanding balance
 * (e.g. to correct an earlier repayment entry).
 */
export async function POST(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor || actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can adjust loan balances" }, { status: 403 });

  try {
    const body = await request.json();
    const loanId = String(body?.loanId || "");
    const amount = Number(body?.amount);
    if (!loanId || !Number.isFinite(amount) || amount === 0) return NextResponse.json({ error: "A loan and a non-zero amount are required" }, { status: 400 });

    const loan = await prisma.loanApplication.findUnique({ where: { id: loanId } });
    if (!loan) return NextResponse.json({ error: "Loan application not found" }, { status: 404 });

    const previousRepaid = loan.amountRepaid;
    const newRepaid = Math.max(previousRepaid + amount, 0);
    const outstandingAfter = Math.max((loan.totalRepayment ?? loan.amount) - newRepaid, 0);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.loanApplication.update({
        where: { id: loanId },
        data: { amountRepaid: newRepaid, status: outstandingAfter <= 0 ? "COMPLETED" : loan.status === "COMPLETED" ? "ACTIVE" : loan.status },
      });
      const transaction = await tx.transaction.create({
        data: {
          userId: loan.userId,
          type: "LOAN_REPAYMENT",
          amount,
          reference: `LNR-${randomUUID()}`,
          description: String(body.reason || (amount > 0 ? "Loan repayment recorded" : "Loan repayment correction")),
          actorId: actor.id,
        },
      });
      await tx.loanStatusHistory.create({ data: { loanId, fromStatus: loan.status, toStatus: updated.status, changedBy: actor.id, reason: String(body.reason || "Repayment adjustment") } });
      await tx.auditEntry.create({
        data: {
          actorId: actor.id,
          action: amount > 0 ? "LOAN_REPAYMENT_RECORDED" : "LOAN_REPAYMENT_CORRECTED",
          entityType: "LoanApplication",
          entityId: loanId,
          previousValue: String(previousRepaid),
          newValue: String(newRepaid),
          reason: String(body.reason || "Loan balance adjusted"),
          transactionId: transaction.id,
          loanId,
        },
      });
      await tx.notification.create({ data: { userId: loan.userId, title: amount > 0 ? "Loan repayment received" : "Loan balance corrected", body: `₦${Math.abs(amount).toLocaleString()} was ${amount > 0 ? "applied to" : "reversed from"} your loan repayment. Outstanding balance is now ₦${outstandingAfter.toLocaleString()}.` } });
      return updated;
    });

    return NextResponse.json({ loan: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Loan adjustment failed" }, { status: 500 });
  }
}
