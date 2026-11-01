import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { ID_CARD_FEE, addCalendarYears, checkPaymentRequest, computeCardDates, computeRenewalDates, effectiveStatus, missingCardFields } from "./idcard-rules";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const complete = { firstName: "A", lastName: "B", address: "1 Road", phone: "080", passportPhoto: "data:image/png;base64,x", nomineePhone: "081", membershipNo: "CPYF/001" };

describe("ID card validity", () => {
  it("expires exactly two calendar years after approval", () => {
    const { expiryDate } = computeCardDates(d("2026-10-15"), d("2026-11-01"));
    expect(expiryDate.toISOString().slice(0, 10)).toBe("2028-10-15");
  });
  it("is not based on the payment date", () => {
    const early = computeCardDates(d("2026-10-15"), d("2026-10-20")).expiryDate;
    const late = computeCardDates(d("2026-10-15"), d("2027-03-01")).expiryDate;
    expect(early.getTime()).toBe(late.getTime());
  });
  it("handles 29 February", () => {
    expect(addCalendarYears(d("2024-02-29"), 2).toISOString().slice(0, 10)).toBe("2026-02-28");
  });
  it("never issues an already-expired first card", () => {
    const now = d("2026-11-01");
    const { expiryDate } = computeCardDates(d("2024-01-10"), now);
    expect(expiryDate.getTime()).toBeGreaterThan(now.getTime());
  });
  it("renewal runs two years from the renewal date", () => {
    expect(computeRenewalDates(d("2029-11-02")).expiryDate.toISOString().slice(0, 10)).toBe("2031-11-02");
  });
  it("marks a card expired once the expiry date is reached", () => {
    const card = { status: "ACTIVE" as const, expiryDate: d("2026-10-15") };
    expect(effectiveStatus(card, d("2026-10-14"))).toBe("ACTIVE");
    expect(effectiveStatus(card, d("2026-10-15"))).toBe("EXPIRED");
    expect(effectiveStatus({ ...card, status: "REVOKED" as const }, d("2030-01-01"))).toBe("REVOKED");
  });
});

describe("payment gate", () => {
  const base = { membershipStatus: "ACTIVE", missing: [], card: null, hasPendingPayment: false, now: d("2026-11-01") };
  it("blocks members who are not approved", () => {
    for (const status of ["PENDING", "REJECTED", "SUSPENDED"]) {
      expect(checkPaymentRequest({ ...base, membershipStatus: status })).toMatchObject({ ok: false, status: 403 });
    }
  });
  it("allows an approved member to start a new-card payment", () => {
    expect(checkPaymentRequest(base)).toEqual({ ok: true, kind: "ISSUE" });
  });
  it("rejects a second payment while one is pending", () => {
    expect(checkPaymentRequest({ ...base, hasPendingPayment: true })).toMatchObject({ ok: false, status: 409 });
  });
  it("requires complete member information", () => {
    expect(checkPaymentRequest({ ...base, missing: ["Address"] })).toMatchObject({ ok: false, status: 422 });
    expect(missingCardFields({ ...complete, nomineePhone: " ", passportPhoto: null })).toEqual(["Passport photograph", "Next of kin phone number"]);
    expect(missingCardFields(complete)).toEqual([]);
  });
  it("does not allow duplicate cards while active, but offers renewal when expired", () => {
    expect(checkPaymentRequest({ ...base, card: { status: "ACTIVE", expiryDate: d("2028-10-15") } })).toMatchObject({ ok: false, status: 409 });
    expect(checkPaymentRequest({ ...base, card: { status: "ACTIVE", expiryDate: d("2026-10-15") } })).toEqual({ ok: true, kind: "RENEWAL" });
    expect(checkPaymentRequest({ ...base, card: { status: "REVOKED", expiryDate: d("2028-10-15") } })).toMatchObject({ ok: false, status: 403 });
  });
  it("fixes the fee at 2000", () => expect(ID_CARD_FEE).toBe(2000));
});

describe("security", () => {
  it("public verification page exposes no private fields", () => {
    const source = readFileSync("src/app/verify/card/[token]/page.tsx", "utf8");
    for (const field of ["address", "phone", "nomineePhone", "passportPhoto", "receipt", "email"]) expect(source).not.toContain(field);
  });
  it("only finance reviewers can verify payments and only the super admin can suspend or revoke", () => {
    expect(readFileSync("src/app/api/admin/idcards/payments/route.ts", "utf8")).toContain('["SUPER_ADMIN", "EXECUTIVE", "FINANCE_OFFICER"]');
    expect(readFileSync("src/app/api/admin/idcards/route.ts", "utf8")).toContain('user.role !== "SUPER_ADMIN"');
  });
  it("member payment endpoint ignores client-supplied amount, dates and IDs", () => {
    const source = readFileSync("src/app/api/idcard/payment/route.ts", "utf8");
    for (const field of ['get("amount")', 'get("expiry', 'get("membership']) expect(source).not.toContain(field);
  });
});
