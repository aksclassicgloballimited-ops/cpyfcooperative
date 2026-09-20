import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const all = new URL(request.url).searchParams.get("scope") === "all";
  if (all && !can(user.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const payments = await prisma.savingsPaymentSubmission.findMany({
    where: all ? undefined : { userId: user.id },
    include: { user: { select: { firstName: true, lastName: true, email: true, membership: { select: { membershipNo: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const form = await request.formData();
  const amount = Number(form.get("amount"));
  const transactionNo = String(form.get("transactionNo") || "").trim();
  const receipt = form.get("receipt");
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Enter a valid savings amount" }, { status: 400 });
  if (!transactionNo && !(receipt instanceof File && receipt.size > 0)) return NextResponse.json({ error: "Upload a payment receipt or enter the bank transaction number" }, { status: 400 });
  if (receipt instanceof File && receipt.size > 150 * 1024) return NextResponse.json({ error: "Receipt must not exceed 150 KB" }, { status: 400 });
  let receiptData: string | null = null;
  if (receipt instanceof File && receipt.size > 0) receiptData = `data:${receipt.type || "application/octet-stream"};base64,${Buffer.from(await receipt.arrayBuffer()).toString("base64")}`;
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.savingsPaymentSubmission.create({ data: { userId: user.id, amount, transactionNo: transactionNo || null, receipt: receiptData } });
    await tx.notification.create({ data: { userId: user.id, title: "Savings payment pending", body: `Your ₦${amount.toLocaleString()} savings payment is awaiting admin confirmation.` } });
    return created;
  });
  return NextResponse.json({ payment }, { status: 201 });
}

export async function PUT(request: Request) {
  const reviewer = await getUserFromRequest(request);
  if (!reviewer || !can(reviewer.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  if (!body.id || !["APPROVED", "REJECTED"].includes(body.status)) return NextResponse.json({ error: "Payment and decision are required" }, { status: 400 });
  const payment = await prisma.savingsPaymentSubmission.findUnique({ where: { id: body.id } });
  if (!payment || payment.status !== "PENDING") return NextResponse.json({ error: "Pending savings payment not found" }, { status: 404 });
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.savingsPaymentSubmission.update({ where: { id: payment.id }, data: { status: body.status, reviewedBy: reviewer.id, reviewedAt: new Date(), rejectionReason: body.status === "REJECTED" ? String(body.reason || "Payment was not approved") : null } });
    if (body.status === "APPROVED") {
      const current = await tx.transaction.aggregate({ _sum: { amount: true }, where: { userId: payment.userId, type: "SAVINGS", status: "POSTED", reversedAt: null } });
      const balanceAfter = Number(current._sum.amount || 0) + payment.amount;
      const transaction = await tx.transaction.create({ data: { userId: payment.userId, type: "SAVINGS", amount: payment.amount, reference: `SAV-${randomUUID()}`, description: "Weekly savings payment approved", balanceAfter, actorId: reviewer.id } });
      await tx.auditEntry.create({ data: { actorId: reviewer.id, action: "SAVINGS_PAYMENT_APPROVED", entityType: "SavingsPaymentSubmission", entityId: payment.id, previousValue: "PENDING", newValue: `APPROVED / ${balanceAfter}`, reason: String(body.reason || "Receipt and payment confirmed"), transactionId: transaction.id } });
    } else {
      await tx.auditEntry.create({ data: { actorId: reviewer.id, action: "SAVINGS_PAYMENT_REJECTED", entityType: "SavingsPaymentSubmission", entityId: payment.id, previousValue: "PENDING", newValue: "REJECTED", reason: String(body.reason || "Payment rejected") } });
    }
    await tx.notification.create({ data: { userId: payment.userId, title: `Savings payment ${body.status.toLowerCase()}`, body: body.status === "APPROVED" ? `Your ₦${payment.amount.toLocaleString()} savings payment has been added to your savings.` : `Your savings payment was rejected. ${body.reason || ""}` } });
    return updated;
  });
  return NextResponse.json({ payment: result });
}
