import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can, canWrite } from "@/lib/permissions";

const SHARE_UNIT_PRICE = 10000;

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const all = new URL(request.url).searchParams.get("scope") === "all";
  if (all && !can(user.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const requests = await prisma.sharePurchaseRequest.findMany({
    where: all ? undefined : { userId: user.id },
    include: { user: { select: { firstName: true, lastName: true, email: true, membership: { select: { membershipNo: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests, unitPrice: SHARE_UNIT_PRICE });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const membership = await prisma.membership.findUnique({ where: { userId: user.id } });
  if (!membership || membership.status !== "ACTIVE") return NextResponse.json({ error: "Only active members can buy shares" }, { status: 403 });
  const form = await request.formData();
  const units = Number(form.get("units"));
  const transactionNo = String(form.get("transactionNo") || "").trim();
  const receipt = form.get("receipt");
  if (!Number.isInteger(units) || units < 1) return NextResponse.json({ error: "Enter a whole number of share units" }, { status: 400 });
  if (!transactionNo && !(receipt instanceof File && receipt.size > 0)) return NextResponse.json({ error: "Upload a payment receipt or enter the bank transaction number" }, { status: 400 });
  if (receipt instanceof File && receipt.size > 150 * 1024) return NextResponse.json({ error: "Receipt must not exceed 150 KB" }, { status: 400 });
  let receiptData: string | null = null;
  if (receipt instanceof File && receipt.size > 0) receiptData = `data:${receipt.type || "application/octet-stream"};base64,${Buffer.from(await receipt.arrayBuffer()).toString("base64")}`;
  const totalAmount = units * SHARE_UNIT_PRICE;
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.sharePurchaseRequest.create({ data: { userId: user.id, units, unitPrice: SHARE_UNIT_PRICE, totalAmount, transactionNo: transactionNo || null, receipt: receiptData } });
    await tx.notification.create({ data: { userId: user.id, title: "Share purchase pending", body: `Your request for ${units} share unit(s) (₦${totalAmount.toLocaleString()}) is awaiting finance approval.` } });
    return row;
  });
  return NextResponse.json({ request: created }, { status: 201 });
}

export async function PUT(request: Request) {
  const reviewer = await getUserFromRequest(request);
  if (!reviewer || !canWrite(reviewer.role, "finance")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  if (!body.id || !["APPROVED", "REJECTED"].includes(body.status)) return NextResponse.json({ error: "Request and decision are required" }, { status: 400 });
  const pending = await prisma.sharePurchaseRequest.findUnique({ where: { id: body.id } });
  if (!pending || pending.status !== "PENDING") return NextResponse.json({ error: "Pending share request not found" }, { status: 404 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      // The status guard makes a double-click or concurrent approval a no-op.
      const claimed = await tx.sharePurchaseRequest.updateMany({
        where: { id: pending.id, status: "PENDING" },
        data: { status: body.status, reviewedBy: reviewer.id, reviewedAt: new Date(), rejectionReason: body.status === "REJECTED" ? String(body.reason || "Payment was not approved") : null },
      });
      if (claimed.count === 0) throw new Error("This request has already been reviewed");
      if (body.status === "APPROVED") {
        const membership = await tx.membership.findUnique({ where: { userId: pending.userId } });
        if (!membership) throw new Error("Member has no membership record");
        const holding = await tx.shareHolding.findFirst({ where: { membershipId: membership.id } });
        const updated = holding
          ? await tx.shareHolding.update({ where: { id: holding.id }, data: { units: holding.units + pending.units, unitPrice: pending.unitPrice } })
          : await tx.shareHolding.create({ data: { membershipId: membership.id, units: pending.units, unitPrice: pending.unitPrice } });
        const shareTransaction = await tx.shareTransaction.create({
          data: { membershipId: membership.id, units: pending.units, unitPrice: pending.unitPrice, type: "PURCHASE", description: "Share purchase approved", reference: `SHR-${randomUUID()}`, actorId: reviewer.id },
        });
        await tx.auditEntry.create({ data: { actorId: reviewer.id, action: "SHARE_PURCHASE_APPROVED", entityType: "SharePurchaseRequest", entityId: pending.id, previousValue: String(holding?.units || 0), newValue: String(updated.units), reason: String(body.reason || "Payment confirmed by finance"), shareTransactionId: shareTransaction.id } });
        await tx.notification.create({ data: { userId: pending.userId, title: "Share purchase approved", body: `${pending.units} share unit(s) have been added to your account.` } });
      } else {
        await tx.auditEntry.create({ data: { actorId: reviewer.id, action: "SHARE_PURCHASE_REJECTED", entityType: "SharePurchaseRequest", entityId: pending.id, previousValue: "PENDING", newValue: "REJECTED", reason: String(body.reason || "Payment rejected") } });
        await tx.notification.create({ data: { userId: pending.userId, title: "Share purchase rejected", body: `Your share purchase request was rejected. ${body.reason || ""}` } });
      }
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review request" }, { status: 400 });
  }
}
