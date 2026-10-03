import type { Prisma, MembershipCategory } from "@prisma/client";

export const APPEARANCE_LEVY = 500;
export const NON_APPEARANCE_LEVY = 1000;

/** Levy amount for a membership category, per week. */
export function levyAmountFor(category: MembershipCategory) {
  return category === "NON_APPEARANCE" ? NON_APPEARANCE_LEVY : APPEARANCE_LEVY;
}

/**
 * The cooperative's payment week runs Wednesday through the following Tuesday.
 * Returns the most recent Wednesday on/before the given date, normalised to
 * midnight, which is used as the unique key for "one levy per member per week".
 */
export function weekStartFor(date: Date) {
  const day = date.getDay(); // 0 = Sunday ... 3 = Wednesday
  const diff = (day - 3 + 7) % 7;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

type LevyTx = Prisma.TransactionClient;

/**
 * Deducts the weekly development levy (once per member per payment week) from
 * a gross savings amount, inside an existing Prisma transaction.
 *
 * Members must never see this activity: callers should only surface the net
 * savings amount to the member, plus a separate notification about the levy.
 */
export async function applyDevelopmentLevy(
  tx: LevyTx,
  params: { userId: string; membershipNo: string; category: MembershipCategory; grossAmount: number; at?: Date; savingsPaymentId?: string }
) {
  const at = params.at || new Date();
  const weekStart = weekStartFor(at);
  const existing = await tx.developmentLevy.findUnique({ where: { userId_weekStart: { userId: params.userId, weekStart } } });
  if (existing) {
    return { levyAmount: 0, netAmount: params.grossAmount, weekStart, levy: null as null };
  }
  const levyAmount = Math.min(levyAmountFor(params.category), Math.max(params.grossAmount, 0));
  const netAmount = params.grossAmount - levyAmount;
  if (levyAmount <= 0) {
    return { levyAmount: 0, netAmount: params.grossAmount, weekStart, levy: null as null };
  }
  const levy = await tx.developmentLevy.create({
    data: {
      userId: params.userId,
      membershipNo: params.membershipNo,
      category: params.category,
      amount: levyAmount,
      weekStart,
      sourceSavingsAmount: params.grossAmount,
      savingsPaymentId: params.savingsPaymentId,
    },
  });
  return { levyAmount, netAmount, weekStart, levy };
}
