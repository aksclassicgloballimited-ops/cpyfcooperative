import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  const body = await request.json();
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform.toLowerCase() : "";
  const validToken = platform === "ios"
    ? /^[a-f\d]{32,128}$/i.test(token)
    : platform === "android" && token.length >= 20 && token.length <= 4096 && !/\s/.test(token);
  if (!validToken) {
    return NextResponse.json({ error: "A valid device token and mobile platform are required" }, { status: 400 });
  }

  await prisma.pushDevice.upsert({
    where: { token },
    create: { userId: user.id, token, platform },
    update: { userId: user.id, platform, lastSeenAt: new Date() },
  });
  return NextResponse.json({ message: "Push notifications enabled for this device" });
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  const body = await request.json();
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "A device token is required" }, { status: 400 });

  await prisma.pushDevice.deleteMany({ where: { userId: user.id, token } });
  return NextResponse.json({ message: "Push notifications disabled for this device" });
}
