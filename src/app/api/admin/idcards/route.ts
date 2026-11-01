import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { IdCardError, cardPayload, changeCardStatus, syncCardLifecycle } from "@/lib/idcard";
import { effectiveStatus } from "@/lib/idcard-rules";

const VIEWERS = ["SUPER_ADMIN", "EXECUTIVE", "FINANCE_OFFICER"];

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (!VIEWERS.includes(user.role)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");

  if (userId) {
    await syncCardLifecycle(userId);
    const member = await prisma.user.findFirst({ where: { id: userId, role: "MEMBER" }, select: { id: true, firstName: true, lastName: true, address: true, phone: true, passportPhoto: true, nomineePhone: true, membership: { select: { membershipNo: true, status: true } } } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    const card = await prisma.idCard.findUnique({ where: { userId } });
    const [events, payments] = await Promise.all([
      prisma.idCardEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.idCardPayment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return NextResponse.json({ member: { id: member.id, status: member.membership?.status }, card: card ? cardPayload(member, card) : null, cardId: card?.id ?? null, renewalCount: card?.renewalCount ?? 0, statusReason: card?.statusReason ?? null, events, payments }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const q = (params.get("q") || "").trim();
  const now = new Date();
  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      membership: { is: { status: "ACTIVE" } },
      ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { membership: { is: { membershipNo: { contains: q, mode: "insensitive" } } } }] } : {}),
    },
    select: { id: true, firstName: true, lastName: true, address: true, phone: true, nomineePhone: true, membership: { select: { membershipNo: true } }, idCard: { select: { status: true, issueDate: true, expiryDate: true, renewalCount: true } }, idCardPayments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, kind: true, reference: true } } },
    orderBy: { firstName: "asc" },
    take: 300,
  });
  const rows = members.map((member) => ({
    userId: member.id,
    name: `${member.firstName} ${member.lastName}`,
    membershipNo: member.membership?.membershipNo ?? null,
    missing: [!member.address?.trim() && "Address", !member.phone?.trim() && "Phone", !member.nomineePhone?.trim() && "Next of kin phone"].filter(Boolean) as string[],
    cardStatus: member.idCard ? effectiveStatus(member.idCard, now) : null,
    issueDate: member.idCard?.issueDate ?? null,
    expiryDate: member.idCard?.expiryDate ?? null,
    renewalCount: member.idCard?.renewalCount ?? 0,
    latestPayment: member.idCardPayments[0] ?? null,
  }));
  const pending = await prisma.idCardPayment.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 100, include: { user: { select: { firstName: true, lastName: true, membership: { select: { membershipNo: true } } } } } });
  return NextResponse.json({ members: rows, pending }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a Super Administrator can suspend, revoke or reinstate ID cards" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim();
  if (!body.userId || !["SUSPEND", "REVOKE", "REINSTATE"].includes(body.action)) return NextResponse.json({ error: "Member and action are required" }, { status: 400 });
  if (reason.length < 3) return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  try {
    const card = await changeCardStatus(String(body.userId), body.action, { id: user.id, role: user.role }, reason);
    return NextResponse.json({ status: card.status });
  } catch (error) {
    if (error instanceof IdCardError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to update ID card" }, { status: 500 });
  }
}
