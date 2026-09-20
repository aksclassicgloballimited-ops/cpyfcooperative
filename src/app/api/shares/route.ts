import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const scopeAll = new URL(request.url).searchParams.get("scope") === "all";
  if (scopeAll && user.role !== "ADMIN" && user.role !== "EXECUTIVE") return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const holdings = await prisma.shareHolding.findMany({
    where: scopeAll ? undefined : { membership: { userId: user.id } },
    include: { membership: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
  });
  const transactions = await prisma.shareTransaction.findMany({
    where: scopeAll ? undefined : { membership: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ holdings, transactions });
}

export async function POST(request: Request) {
  const actor = await getUserFromRequest(request);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "EXECUTIVE")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const body = await request.json();
    const membershipId = String(body?.membershipId || "");
    const units = Number(body?.units);
    const unitPrice = Number(body?.unitPrice);
    const type = String(body?.type || "ALLOCATE");
    if (!membershipId || !Number.isInteger(units) || units === 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ error: "Membership, whole share units, and unit price are required" }, { status: 400 });
    }
    const result = await prisma.$transaction(async (tx) => {
      const holding = await tx.shareHolding.findFirst({ where: { membershipId } });
      const updated = holding
        ? await tx.shareHolding.update({ where: { id: holding.id }, data: { units: holding.units + units, unitPrice } })
        : await tx.shareHolding.create({ data: { membershipId, units, unitPrice } });
      const transaction = await tx.shareTransaction.create({
        data: { membershipId, units, unitPrice, type, description: String(body.description || "Share adjustment"), reference: `SHR-${randomUUID()}`, actorId: actor.id },
      });
      return { holding: updated, transaction };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Share adjustment failed" }, { status: 500 });
  }
}
