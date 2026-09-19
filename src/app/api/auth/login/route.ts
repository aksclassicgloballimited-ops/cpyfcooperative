import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { seedDemoUsers } from "@/lib/demo-seed";
import { createSessionLocal, findUserByEmailLocal, sanitizeUser, verifyUserCredentialsLocal } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await seedDemoUsers();
      const user = await prisma.user.findUnique({
        where: { email },
        include: { membership: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const isValid = await compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const { passwordHash: _passwordHash, ...safeUser } = user;
      const token = await createSessionLocal(user.id);
      const response = NextResponse.json({ user: safeUser }, { status: 200 });
      response.cookies.set("cpyif_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    const user = await verifyUserCredentialsLocal(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionLocal(user.id);
    const response = NextResponse.json({ user: sanitizeUser(user) }, { status: 200 });
    response.cookies.set("cpyif_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
