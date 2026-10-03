import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { APPEARANCE_LEVY, NON_APPEARANCE_LEVY } from "@/lib/development-levy";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !can(user.role, "developmentLevy")) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const week = searchParams.get("week");
  const search = searchParams.get("search")?.trim();
  const format = searchParams.get("format");

  const where: Record<string, unknown> = {};
  if (category === "APPEARANCE" || category === "NON_APPEARANCE") where.category = category;
  if (week) where.weekStart = new Date(week);
  if (search) {
    where.OR = [
      { membershipNo: { contains: search, mode: "insensitive" } },
      { user: { firstName: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const levies = await prisma.developmentLevy.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { weekStart: "desc" },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [allTime, thisMonth, appearanceTotal, nonAppearanceTotal] = await Promise.all([
    prisma.developmentLevy.aggregate({ _sum: { amount: true } }),
    prisma.developmentLevy.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: monthStart } } }),
    prisma.developmentLevy.aggregate({ _sum: { amount: true }, where: { category: "APPEARANCE" } }),
    prisma.developmentLevy.aggregate({ _sum: { amount: true }, where: { category: "NON_APPEARANCE" } }),
  ]);

  const summary = {
    allTime: Number(allTime._sum.amount || 0),
    thisMonth: Number(thisMonth._sum.amount || 0),
    appearanceTotal: Number(appearanceTotal._sum.amount || 0),
    nonAppearanceTotal: Number(nonAppearanceTotal._sum.amount || 0),
    appearanceRate: APPEARANCE_LEVY,
    nonAppearanceRate: NON_APPEARANCE_LEVY,
  };

  if (format === "csv") {
    const header = "Date,Membership No,Full Name,Type,Amount Deducted,Week,Source Savings Amount\n";
    const rows = levies
      .map((levy) =>
        `${levy.createdAt.toISOString()},${levy.membershipNo},"${levy.user.firstName} ${levy.user.lastName}",${levy.category},${levy.amount},${levy.weekStart.toISOString().slice(0, 10)},${levy.sourceSavingsAmount}`
      )
      .join("\n");
    return new NextResponse(header + rows, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=development-levy.csv" } });
  }

  return NextResponse.json({ levies, summary });
}
