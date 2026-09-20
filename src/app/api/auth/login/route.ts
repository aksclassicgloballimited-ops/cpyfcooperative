import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionLocal } from "@/lib/store";

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

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { membership: true },
    });
    if (!user || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionLocal(user.id);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    const response = NextResponse.json({ user: safeUser }, { status: 200 });
    response.cookies.set("cpyif_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
