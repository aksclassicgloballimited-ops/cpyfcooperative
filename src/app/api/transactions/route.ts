import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const requestedUserId = new URL(request.url).searchParams.get("userId");
  if (requestedUserId && requestedUserId !== user.id && user.role !== "PRESIDENT" && user.role !== "EXECUTIVE") return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const userId = requestedUserId || user.id;
  // Members must never see their development levy deductions in this feed.
  const showLevy = can(user.role, "developmentLevy");
  const [transactions, loans, shares] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, ...(showLevy ? {} : { type: { not: "DEVELOPMENT_LEVY" } }) }, orderBy: { createdAt: "desc" } }),
    prisma.loanApplication.findMany({ where: { userId, status: { in: ["DISBURSED", "ACTIVE", "COMPLETED"] } }, select: { applicationNo: true, type: true, amount: true, createdAt: true, status: true } }),
    prisma.shareTransaction.findMany({ where: { membership: { userId } }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ transactions, loans, shares });
}
