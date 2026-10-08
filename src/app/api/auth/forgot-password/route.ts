import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

const GENERIC = "If the email and membership number match a member account, a password reset link has been sent to that email.";

export async function POST(request: Request) {
  try {
    const { email, membershipNo } = await request.json();
    if (!email || !membershipNo) {
      return NextResponse.json({ error: "Email and membership number are required" }, { status: 400 });
    }
    if (!isMailConfigured()) {
      return NextResponse.json({ error: "Password reset email is not configured yet. Please contact the administrator." }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { membership: true },
    });
    if (!user || user.role !== "MEMBER" || !user.isActive || user.membership?.membershipNo?.toLowerCase() !== String(membershipNo).trim().toLowerCase()) {
      return NextResponse.json({ message: GENERIC });
    }

    const token = randomBytes(32).toString("hex");
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const base = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(request.url).origin);
    const link = `${base}/reset-password?token=${token}`;
    await sendMail(
      user.email,
      "Reset your CPYIF password",
      `<p>Hello ${user.firstName},</p><p>Click the link below to reset your CPYIF Cooperative password. It expires in 1 hour.</p><p><a href="${link}">Reset my password</a></p><p>If you did not request this, you can ignore this email.</p>`
    );
    return NextResponse.json({ message: GENERIC });
  } catch {
    return NextResponse.json({ error: "Unable to process the request right now. Please try again later." }, { status: 500 });
  }
}
