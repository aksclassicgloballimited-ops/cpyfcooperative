export const ID_CARD_FEE = 2000;
export const ID_CARD_VALIDITY_YEARS = 2;
export const EXPIRY_NOTICE_DAYS = 30;

export type CardStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REVOKED";

// Calendar-year addition in UTC. 29 Feb + n years falls back to 28 Feb when the target year is not a leap year.
export function addCalendarYears(date: Date, years: number) {
  const result = new Date(date.getTime());
  const month = result.getUTCMonth();
  result.setUTCFullYear(result.getUTCFullYear() + years);
  if (result.getUTCMonth() !== month) result.setUTCDate(0);
  return result;
}

export function computeCardDates(approvalDate: Date, now: Date) {
  const fromApproval = addCalendarYears(approvalDate, ID_CARD_VALIDITY_YEARS);
  // A member approved more than two years ago would otherwise receive an already-expired card.
  if (fromApproval.getTime() > now.getTime()) return { issueDate: now, expiryDate: fromApproval, basedOn: "APPROVAL" as const };
  return { issueDate: now, expiryDate: addCalendarYears(now, ID_CARD_VALIDITY_YEARS), basedOn: "ISSUE" as const };
}

export function computeRenewalDates(renewalDate: Date) {
  return { issueDate: renewalDate, expiryDate: addCalendarYears(renewalDate, ID_CARD_VALIDITY_YEARS) };
}

export function effectiveStatus(card: { status: CardStatus; expiryDate: Date }, now: Date): CardStatus {
  if (card.status === "ACTIVE" && card.expiryDate.getTime() <= now.getTime()) return "EXPIRED";
  return card.status;
}

export function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export type CardMember = {
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  phone?: string | null;
  passportPhoto?: string | null;
  nomineePhone?: string | null;
  membershipNo?: string | null;
};

export function missingCardFields(member: CardMember) {
  const missing: string[] = [];
  const blank = (value?: string | null) => !value || !value.trim();
  if (blank(member.firstName) || blank(member.lastName)) missing.push("Full name");
  if (blank(member.membershipNo)) missing.push("Membership ID");
  if (blank(member.address)) missing.push("Address");
  if (blank(member.phone)) missing.push("Phone number");
  if (blank(member.passportPhoto)) missing.push("Passport photograph");
  if (blank(member.nomineePhone)) missing.push("Next of kin phone number");
  return missing;
}

export type PaymentRequestCheck =
  | { ok: true; kind: "ISSUE" | "RENEWAL" }
  | { ok: false; status: number; error: string };

// Server-side gate for starting a payment. Approval and payment are checked independently.
export function checkPaymentRequest(input: {
  membershipStatus?: string | null;
  missing: string[];
  card: { status: CardStatus; expiryDate: Date } | null;
  hasPendingPayment: boolean;
  now: Date;
}): PaymentRequestCheck {
  if (input.membershipStatus !== "ACTIVE") return { ok: false, status: 403, error: "Your membership has not been approved yet" };
  if (input.missing.length) return { ok: false, status: 422, error: `Update your profile or ask an administrator to complete: ${input.missing.join(", ")}` };
  if (input.hasPendingPayment) return { ok: false, status: 409, error: "An ID card payment is already awaiting verification" };
  if (!input.card) return { ok: true, kind: "ISSUE" };
  const status = effectiveStatus(input.card, input.now);
  if (status === "EXPIRED") return { ok: true, kind: "RENEWAL" };
  if (status === "SUSPENDED" || status === "REVOKED") return { ok: false, status: 403, error: `Your ID card is ${status.toLowerCase()}. Contact the cooperative office` };
  return { ok: false, status: 409, error: "You already hold an active ID card" };
}
