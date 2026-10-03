import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !can(user.role, "reports")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const [members, savings, shares, loans, outstandingLoans] = await Promise.all([
    prisma.membership.groupBy({ by: ["status", "grade", "category"], _count: { _all: true } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "SAVINGS", status: "POSTED", reversedAt: null } }),
    prisma.shareHolding.aggregate({ _sum: { units: true } }),
    prisma.loanApplication.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    prisma.loanApplication.findMany({ where: { status: { in: ["ACTIVE", "DISBURSED", "APPROVED"] } }, select: { amount: true, totalRepayment: true, amountRepaid: true } }),
  ]);
  const memberCount = members.reduce((sum, item) => sum + item._count._all, 0);
  const totalSavings = Number(savings._sum.amount || 0);
  const totalShares = Number(shares._sum.units || 0);
  const count = (status: string) => loans.find((item) => item.status === status)?._count._all || 0;
  const outstandingBalance = outstandingLoans.reduce((sum, loan) => sum + Math.max((loan.totalRepayment ?? loan.amount) - loan.amountRepaid, 0), 0);
  const sumMembers = (match: { status?: string; grade?: string; category?: string }) =>
    members
      .filter((item) => (!match.status || item.status === match.status) && (!match.grade || item.grade === match.grade) && (!match.category || item.category === match.category))
      .reduce((sum, item) => sum + item._count._all, 0);
  const response = NextResponse.json({
    statistics: {
      totalMembers: memberCount,
      pendingMembers: sumMembers({ status: "PENDING" }),
      activeMembers: sumMembers({ status: "ACTIVE" }),
      activeAppearance: sumMembers({ status: "ACTIVE", category: "APPEARANCE" }),
      activeNonAppearance: sumMembers({ status: "ACTIVE", category: "NON_APPEARANCE" }),
      silverMembers: sumMembers({ status: "ACTIVE", grade: "SILVER" }),
      silverAppearance: sumMembers({ status: "ACTIVE", grade: "SILVER", category: "APPEARANCE" }),
      silverNonAppearance: sumMembers({ status: "ACTIVE", grade: "SILVER", category: "NON_APPEARANCE" }),
      goldenMembers: sumMembers({ status: "ACTIVE", grade: "GOLDEN" }),
      goldenAppearance: sumMembers({ status: "ACTIVE", grade: "GOLDEN", category: "APPEARANCE" }),
      goldenNonAppearance: sumMembers({ status: "ACTIVE", grade: "GOLDEN", category: "NON_APPEARANCE" }),
      totalSavings,
      totalShares,
      activeLoans: count("ACTIVE") + count("DISBURSED") + count("APPROVED"),
      outstandingLoans: outstandingBalance,
      completedLoans: count("COMPLETED"),
      pendingLoanApplications: count("SUBMITTED") + count("UNDER_REVIEW") + count("PENDING"),
    },
    loanStatuses: loans.map((item) => ({ status: item.status, count: item._count._all, amount: item._sum.amount || 0 })),
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
