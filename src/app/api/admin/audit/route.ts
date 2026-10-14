import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !["SUPER_ADMIN", "EXECUTIVE"].includes(user.role)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const entries = await prisma.auditEntry.findMany({ include: { actor: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ entries: entries.map((entry) => ({ ...entry, actionRole: entry.actorRole || entry.actor.role, actionDate: entry.createdAt })) });
}
