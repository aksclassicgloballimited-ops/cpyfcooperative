import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { seedDemoUsers } from "@/lib/demo-seed";
import { createSessionLocal, createUserLocal, findUserByEmailLocal, sanitizeUser } from "@/lib/store";
import { registrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration details", issues: parsed.error.issues }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, category, weeklyTarget } = parsed.data;

    if (process.env.DATABASE_URL) {
      await seedDemoUsers();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
      }

      const passwordHash = await hash(password, 12);
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
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
      response.cookies.set("cpyif_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    const existing = await findUserByEmailLocal(email);
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    const user = await createUserLocal({
      firstName,
      lastName,
      email,
      phone,
      password,
      category,
      weeklyTarget,
    });

    const token = await createSessionLocal(user.id);
    const response = NextResponse.json({ user: sanitizeUser(user), membershipNo: user.membership?.membershipNo }, { status: 201 });
    response.cookies.set("cpyif_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
