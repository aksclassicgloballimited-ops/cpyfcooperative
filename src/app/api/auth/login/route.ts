import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionLocal } from "@/lib/store";
import { SESSION_COOKIE, isJwtConfigured, sessionCookieOptions, sessionMaxAgeForRole, signSessionJwt } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Authentication is not configured. Add DATABASE_URL to the deployment environment." }, { status: 503 });
    }

    if (!isJwtConfigured()) {
      return NextResponse.json({ error: "Authentication is not configured. Add JWT_SECRET (32+ characters) to the deployment environment." }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { membership: true },
    });
    if (!user || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "This account has been deactivated. Contact the Super Administrator." }, { status: 403 });
    }

    const sid = await createSessionLocal(user.id);
    const token = await signSessionJwt({ sid, sub: user.id, role: user.role });
    const { passwordHash: _passwordHash, ...safeUser } = user;
    const response = NextResponse.json({ user: safeUser }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(sessionMaxAgeForRole(user.role)));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
