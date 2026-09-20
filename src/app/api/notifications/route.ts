import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ notifications, unread: notifications.filter((item) => !item.readAt).length });
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const body = await request.json();
  if (body.id) await prisma.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { readAt: new Date() } });
  else await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ message: "Notifications updated" });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "ADMIN" && user.role !== "EXECUTIVE")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  if (!body.userId || !body.title || !body.body) return NextResponse.json({ error: "Member, title, and message are required" }, { status: 400 });
  const notification = await prisma.notification.create({ data: { userId: String(body.userId), title: String(body.title), body: String(body.body) } });
  return NextResponse.json({ notification }, { status: 201 });
}
