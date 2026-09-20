import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ commodities: await prisma.commodity.findMany({ where: { active: true }, orderBy: { name: "asc" } }) });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "ADMIN" && user.role !== "EXECUTIVE")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  const commodity = await prisma.commodity.create({ data: { name: String(body.name), description: String(body.description), price: Number(body.price), availableQuantity: Number(body.availableQuantity), image: body.image ? String(body.image) : null } });
  return NextResponse.json({ commodity }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "ADMIN" && user.role !== "EXECUTIVE")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  const commodity = await prisma.commodity.update({ where: { id: body.id }, data: { name: String(body.name), description: String(body.description), price: Number(body.price), availableQuantity: Number(body.availableQuantity), active: Boolean(body.active), image: body.image ? String(body.image) : null } });
  return NextResponse.json({ commodity });
}
