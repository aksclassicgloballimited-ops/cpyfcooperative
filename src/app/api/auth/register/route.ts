import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionLocal } from "@/lib/store";
import { registrationSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration details", issues: parsed.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, category, weeklyTarget } = parsed.data;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Registration is not configured. Add DATABASE_URL to the deployment environment." }, { status: 503 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        membership: {
          create: {
            category,
            membershipNo: `CPYF-${Date.now()}`,
            weeklyTarget,
          },
        },
      },
      include: { membership: true },
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    const token = await createSessionLocal(user.id);
    const response = NextResponse.json({ user: safeUser, membershipNo: user.membership?.membershipNo }, { status: 201 });
    response.cookies.set("cpyif_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
