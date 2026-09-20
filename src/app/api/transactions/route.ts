import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const requestedUserId = new URL(request.url).searchParams.get("userId");
  if (requestedUserId && requestedUserId !== user.id && user.role !== "ADMIN" && user.role !== "EXECUTIVE") return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const userId = requestedUserId || user.id;
  const [transactions, loans, shares] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.loanApplication.findMany({ where: { userId, status: { in: ["DISBURSED", "ACTIVE", "COMPLETED"] } }, select: { applicationNo: true, type: true, amount: true, createdAt: true, status: true } }),
    prisma.shareTransaction.findMany({ where: { membership: { userId } }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ transactions, loans, shares });
}
