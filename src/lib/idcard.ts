import { randomBytes, randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { EXPIRY_NOTICE_DAYS, ID_CARD_FEE, checkPaymentRequest, computeCardDates, computeRenewalDates, daysUntil, effectiveStatus, missingCardFields, type CardStatus } from "@/lib/idcard-rules";

export class IdCardError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;
type Actor = { id: string; role: string };

const memberSelect = { firstName: true, lastName: true, address: true, phone: true, passportPhoto: true, nomineePhone: true, membership: { select: { membershipNo: true, status: true, joinedAt: true } } } as const;

export async function recordCardEvent(tx: Tx, data: { cardId?: string | null; userId: string; action: string; actor?: Actor | null; reason?: string | null; reference?: string | null; issueDate?: Date | null; expiryDate?: Date | null }) {
  await tx.idCardEvent.create({ data: { cardId: data.cardId ?? null, userId: data.userId, action: data.action, actorId: data.actor?.id, actorRole: data.actor?.role, reason: data.reason, reference: data.reference, issueDate: data.issueDate, expiryDate: data.expiryDate } });
  if (data.actor) {
    await tx.auditEntry.create({ data: { actorId: data.actor.id, actorRole: data.actor.role, action: `ID_CARD_${data.action}`, entityType: "IdCard", entityId: data.cardId ?? data.userId, newValue: data.reference ?? undefined, reason: data.reason || data.action } });
  }
}

// Persists expiry the first time an expired card is seen and sends a single pre-expiry notice per expiry date.
export async function syncCardLifecycle(userId: string) {
  const card = await prisma.idCard.findUnique({ where: { userId } });
  if (!card) return null;
  const now = new Date();
  if (card.status === "ACTIVE" && card.expiryDate <= now) {
    const [updated] = await prisma.$transaction(async (tx) => {
      const changed = await tx.idCard.updateMany({ where: { id: card.id, status: "ACTIVE" }, data: { status: "EXPIRED" } });
      if (changed.count) {
        await recordCardEvent(tx, { cardId: card.id, userId, action: "EXPIRED", expiryDate: card.expiryDate });
        await tx.notification.create({ data: { userId, title: "ID card expired", body: `Your membership ID card expired. Renew it for ₦${ID_CARD_FEE.toLocaleString()} from your dashboard.` } });
      }
      return [await tx.idCard.findUniqueOrThrow({ where: { id: card.id } })];
    });
    return updated;
  }
  if (card.status === "ACTIVE" && daysUntil(card.expiryDate, now) <= EXPIRY_NOTICE_DAYS) {
    const sent = await prisma.idCardEvent.findFirst({ where: { cardId: card.id, action: "EXPIRY_NOTICE", expiryDate: card.expiryDate } });
    if (!sent) {
      await prisma.$transaction(async (tx) => {
        await recordCardEvent(tx, { cardId: card.id, userId, action: "EXPIRY_NOTICE", expiryDate: card.expiryDate });
        await tx.notification.create({ data: { userId, title: "ID card expiring soon", body: `Your membership ID card expires on ${card.expiryDate.toDateString()}. You can renew it for ₦${ID_CARD_FEE.toLocaleString()} once it expires.` } });
      });
    }
  }
  return card;
}

export function cardPayload(user: { firstName: string; lastName: string; address: string | null; phone: string; passportPhoto: string | null; nomineePhone: string | null; membership: { membershipNo: string | null } | null }, card: { verifyToken: string; status: CardStatus; approvalDate: Date; issueDate: Date; expiryDate: Date; lastRenewalDate: Date | null }) {
  return {
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    membershipNo: user.membership?.membershipNo ?? "",
    address: user.address ?? "",
    phone: user.phone,
    nomineePhone: user.nomineePhone ?? "",
    passportPhoto: user.passportPhoto ?? "",
    status: effectiveStatus(card, new Date()),
    approvalDate: card.approvalDate.toISOString(),
    issueDate: card.issueDate.toISOString(),
    expiryDate: card.expiryDate.toISOString(),
    lastRenewalDate: card.lastRenewalDate?.toISOString() ?? null,
    verifyToken: card.verifyToken,
  };
}

const paymentView = { id: true, kind: true, amount: true, reference: true, transactionNo: true, status: true, rejectionReason: true, createdAt: true, reviewedAt: true, reviewedByRole: true } as const;

export async function getMemberOverview(userId: string) {
  const synced = await syncCardLifecycle(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: memberSelect });
  if (!user) throw new IdCardError(404, "Member not found");
  const card = synced ?? null;
  const payments = await prisma.idCardPayment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: paymentView });
  const missing = missingCardFields({ ...user, membershipNo: user.membership?.membershipNo });
  const check = checkPaymentRequest({ membershipStatus: user.membership?.status, missing, card, hasPendingPayment: payments.some((p) => p.status === "PENDING"), now: new Date() });
  const history = card ? await prisma.idCardEvent.findMany({ where: { cardId: card.id, action: { in: ["ISSUED", "RENEWED"] } }, orderBy: { createdAt: "desc" }, select: { action: true, reference: true, issueDate: true, expiryDate: true, createdAt: true } }) : [];
  return {
    fee: ID_CARD_FEE,
    membershipStatus: user.membership?.status ?? "PENDING",
    membershipNo: user.membership?.membershipNo ?? null,
    missing,
    canRequest: check.ok ? check.kind : null,
    blockedReason: check.ok ? null : check.error,
    cardStatus: card ? effectiveStatus(card, new Date()) : null,
    card: card ? cardPayload(user, card) : null,
    payments,
    history,
  };
}

export async function submitCardPayment(userId: string, input: { transactionNo: string | null; receipt: string | null }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: memberSelect });
  if (!user) throw new IdCardError(404, "Member not found");
  await syncCardLifecycle(userId);
  const card = await prisma.idCard.findUnique({ where: { userId } });
  const pending = await prisma.idCardPayment.findFirst({ where: { userId, status: "PENDING" }, select: { id: true } });
  const check = checkPaymentRequest({ membershipStatus: user.membership?.status, missing: missingCardFields({ ...user, membershipNo: user.membership?.membershipNo }), card, hasPendingPayment: Boolean(pending), now: new Date() });
  if (!check.ok) throw new IdCardError(check.status, check.error);
  if (input.transactionNo) {
    const reused = await prisma.idCardPayment.findFirst({ where: { transactionNo: input.transactionNo, status: { not: "REJECTED" } }, select: { id: true } });
    if (reused) throw new IdCardError(409, "That transaction number has already been submitted");
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.idCardPayment.create({ data: { userId, cardId: card?.id ?? null, kind: check.kind, amount: ID_CARD_FEE, reference: `IDC-${randomUUID()}`, transactionNo: input.transactionNo, receipt: input.receipt, pendingKey: userId } });
      await recordCardEvent(tx, { cardId: card?.id, userId, action: "PAYMENT_SUBMITTED", reference: payment.reference });
      await tx.notification.create({ data: { userId, title: "ID card payment pending", body: `Your ₦${ID_CARD_FEE.toLocaleString()} ID card payment (${payment.reference}) is awaiting verification by the finance team.` } });
      return payment;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new IdCardError(409, "An ID card payment is already awaiting verification");
    throw error;
  }
}

export async function reviewCardPayment(paymentId: string, decision: "APPROVED" | "REJECTED", reviewer: Actor, reason: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.idCardPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new IdCardError(404, "Payment not found");
    if (payment.status !== "PENDING") throw new IdCardError(409, "This payment has already been reviewed");
    const user = await tx.user.findUnique({ where: { id: payment.userId }, select: memberSelect });
    if (!user) throw new IdCardError(404, "Member not found");
    let card = await tx.idCard.findUnique({ where: { userId: payment.userId } });

    if (decision === "APPROVED") {
      if (user.membership?.status !== "ACTIVE") throw new IdCardError(409, "The member's application is not approved, so no card can be issued");
      const missing = missingCardFields({ ...user, membershipNo: user.membership?.membershipNo });
      if (missing.length) throw new IdCardError(422, `Complete the member's details first: ${missing.join(", ")}`);
      if (payment.kind === "ISSUE" && card) throw new IdCardError(409, "This member already has a card");
      if (payment.kind === "RENEWAL" && (!card || effectiveStatus(card, new Date()) !== "EXPIRED")) throw new IdCardError(409, "This card is not due for renewal");
    }

    const claimed = await tx.idCardPayment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: decision, pendingKey: null, reviewedBy: reviewer.id, reviewedByRole: reviewer.role, reviewedAt: new Date(), rejectionReason: decision === "REJECTED" ? reason : null } });
    if (claimed.count !== 1) throw new IdCardError(409, "This payment has already been reviewed");

    if (decision === "REJECTED") {
      await recordCardEvent(tx, { cardId: card?.id, userId: payment.userId, action: "PAYMENT_REJECTED", actor: reviewer, reason, reference: payment.reference });
      await tx.notification.create({ data: { userId: payment.userId, title: "ID card payment rejected", body: `Your ID card payment ${payment.reference} was rejected. Reason: ${reason}` } });
      return { userId: payment.userId, decision };
    }

    const now = new Date();
    if (payment.kind === "ISSUE") {
      const approvalDate = user.membership?.joinedAt ?? now;
      const dates = computeCardDates(approvalDate, now);
      card = await tx.idCard.create({ data: { userId: payment.userId, verifyToken: randomBytes(24).toString("hex"), status: "ACTIVE", approvalDate, issueDate: dates.issueDate, expiryDate: dates.expiryDate } });
      await recordCardEvent(tx, { cardId: card.id, userId: payment.userId, action: "PAYMENT_APPROVED", actor: reviewer, reason: reason || "Payment verified", reference: payment.reference });
      await recordCardEvent(tx, { cardId: card.id, userId: payment.userId, action: "ISSUED", actor: reviewer, reference: payment.reference, issueDate: card.issueDate, expiryDate: card.expiryDate });
    } else {
      const dates = computeRenewalDates(now);
      card = await tx.idCard.update({ where: { id: card!.id }, data: { status: "ACTIVE", issueDate: dates.issueDate, expiryDate: dates.expiryDate, lastRenewalDate: now, renewalCount: { increment: 1 }, statusReason: null } });
      await recordCardEvent(tx, { cardId: card.id, userId: payment.userId, action: "PAYMENT_APPROVED", actor: reviewer, reason: reason || "Payment verified", reference: payment.reference });
      await recordCardEvent(tx, { cardId: card.id, userId: payment.userId, action: "RENEWED", actor: reviewer, reference: payment.reference, issueDate: card.issueDate, expiryDate: card.expiryDate });
    }
    await tx.idCardPayment.update({ where: { id: payment.id }, data: { cardId: card.id } });
    await tx.notification.create({ data: { userId: payment.userId, title: payment.kind === "ISSUE" ? "ID card ready" : "ID card renewed", body: `Your payment was verified. Your membership ID card is valid until ${card.expiryDate.toDateString()}. Open your dashboard to download or print it.` } });
    return { userId: payment.userId, decision };
  });
  await sendPushNotification(result.userId, { title: result.decision === "APPROVED" ? "ID card ready" : "ID card payment rejected", body: result.decision === "APPROVED" ? "Your payment was verified. Your ID card is ready." : `Reason: ${reason}` }).catch(() => undefined);
  return result;
}

export async function changeCardStatus(userId: string, action: "SUSPEND" | "REVOKE" | "REINSTATE", actor: Actor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.idCard.findUnique({ where: { userId } });
    if (!card) throw new IdCardError(404, "This member has no ID card");
    let next: CardStatus;
    if (action === "SUSPEND") {
      if (card.status !== "ACTIVE") throw new IdCardError(409, "Only an active card can be suspended");
      next = "SUSPENDED";
    } else if (action === "REVOKE") {
      if (card.status === "REVOKED") throw new IdCardError(409, "This card is already revoked");
      next = "REVOKED";
    } else {
      if (card.status !== "SUSPENDED" && card.status !== "REVOKED") throw new IdCardError(409, "Only a suspended or revoked card can be reinstated");
      next = card.expiryDate <= new Date() ? "EXPIRED" : "ACTIVE";
    }
    const updated = await tx.idCard.update({ where: { id: card.id }, data: { status: next, statusReason: reason, statusChangedBy: actor.id, statusChangedAt: new Date() } });
    await recordCardEvent(tx, { cardId: card.id, userId, action: action === "SUSPEND" ? "SUSPENDED" : action === "REVOKE" ? "REVOKED" : "REINSTATED", actor, reason, expiryDate: card.expiryDate });
    await tx.notification.create({ data: { userId, title: `ID card ${next.toLowerCase()}`, body: `Your membership ID card is now ${next.toLowerCase()}. Reason: ${reason}` } });
    return updated;
  });
}
