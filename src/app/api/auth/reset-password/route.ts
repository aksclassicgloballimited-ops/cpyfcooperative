import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "A valid token and a password of at least 8 characters are required" }, { status: 400 });
    }

    const record = await prisma.passwordReset.findUnique({ where: { tokenHash: createHash("sha256").update(String(token)).digest("hex") } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    return NextResponse.json({ message: "Password updated. You can now log in." });
  } catch {
    return NextResponse.json({ error: "Unable to reset password right now. Please try again later." }, { status: 500 });
  }
}
