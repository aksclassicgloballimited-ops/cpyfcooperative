import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const received = await prisma.guarantorRequest.findMany({
    where: { guarantorId: user.id },
    include: { requester: { select: { firstName: true, lastName: true, email: true, membership: { select: { membershipNo: true } } } }, loanApplication: { select: { applicationNo: true, type: true, amount: true, purpose: true } } },
    orderBy: { createdAt: "desc" },
  });
  const made = await prisma.guarantorRequest.findMany({
    where: { requesterId: user.id },
    include: { guarantor: { select: { firstName: true, lastName: true, membership: { select: { membershipNo: true } } } }, loanApplication: { select: { applicationNo: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ received, made });
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const { id, status } = await request.json();
  if (!id || !["ACCEPTED", "REJECTED"].includes(status)) return NextResponse.json({ error: "A valid request and response are required" }, { status: 400 });
  const existing = await prisma.guarantorRequest.findFirst({ where: { id, guarantorId: user.id } });
  if (!existing) return NextResponse.json({ error: "Guarantor request not found" }, { status: 404 });
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.guarantorRequest.update({ where: { id }, data: { status, respondedAt: new Date() } });
    await tx.notification.create({ data: { userId: existing.requesterId, title: `Guarantor request ${status.toLowerCase()}`, body: `Your guarantor request has been ${status.toLowerCase()}.` } });
    return result;
  });
  return NextResponse.json({ request: updated });
}
