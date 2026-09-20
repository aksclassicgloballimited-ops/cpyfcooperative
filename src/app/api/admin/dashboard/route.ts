import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !can(user.role, "reports")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const [members, savings, shares, loans] = await Promise.all([
    prisma.membership.groupBy({ by: ["status", "grade", "category"], _count: { _all: true } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "SAVINGS", status: "POSTED", reversedAt: null } }),
    prisma.shareHolding.aggregate({ _sum: { units: true } }),
    prisma.loanApplication.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
  ]);
  const memberCount = members.reduce((sum, item) => sum + item._count._all, 0);
  const totalSavings = Number(savings._sum.amount || 0);
  const totalShares = Number(shares._sum.units || 0);
  const count = (status: string) => loans.find((item) => item.status === status)?._count._all || 0;
  return NextResponse.json({
    statistics: {
      totalMembers: memberCount,
      pendingMembers: members.find((item) => item.status === "PENDING")?._count._all || 0,
      activeMembers: members.filter((item) => item.status === "ACTIVE").reduce((sum, item) => sum + item._count._all, 0),
      activeAppearance: members.find((item) => item.status === "ACTIVE" && item.category === "APPEARANCE")?._count._all || 0,
      activeNonAppearance: members.find((item) => item.status === "ACTIVE" && item.category === "NON_APPEARANCE")?._count._all || 0,
      silverMembers: members.filter((item) => item.grade === "SILVER").reduce((sum, item) => sum + item._count._all, 0),
      silverAppearance: members.find((item) => item.grade === "SILVER" && item.category === "APPEARANCE")?._count._all || 0,
      silverNonAppearance: members.find((item) => item.grade === "SILVER" && item.category === "NON_APPEARANCE")?._count._all || 0,
      goldenMembers: members.filter((item) => item.grade === "GOLDEN").reduce((sum, item) => sum + item._count._all, 0),
      goldenAppearance: members.find((item) => item.grade === "GOLDEN" && item.category === "APPEARANCE")?._count._all || 0,
      goldenNonAppearance: members.find((item) => item.grade === "GOLDEN" && item.category === "NON_APPEARANCE")?._count._all || 0,
      totalSavings,
      totalShares,
      activeLoans: count("ACTIVE") + count("DISBURSED") + count("APPROVED"),
      outstandingLoans: loans.filter((item) => ["ACTIVE", "DISBURSED", "APPROVED"].includes(item.status)).reduce((sum, item) => sum + Number(item._sum.amount || 0), 0),
      completedLoans: count("COMPLETED"),
      pendingLoanApplications: count("SUBMITTED") + count("UNDER_REVIEW") + count("PENDING"),
    },
    loanStatuses: loans.map((item) => ({ status: item.status, count: item._count._all, amount: item._sum.amount || 0 })),
  });
}
