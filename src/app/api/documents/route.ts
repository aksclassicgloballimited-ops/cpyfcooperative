import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get("userId");
  if (requestedUserId && requestedUserId !== user.id && user.role !== "ADMIN" && user.role !== "EXECUTIVE") return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const userId = requestedUserId || user.id;
  const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, passportPhoto: true, identificationDocument: true, loans: { select: { id: true, applicationNo: true, type: true, propertyDocuments: true, supportingDocuments: true, documents: true }, orderBy: { createdAt: "desc" } } } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json({ documents: member });
}
