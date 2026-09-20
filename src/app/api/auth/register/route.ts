import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionLocal } from "@/lib/store";
import { registrationSchema } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024;

async function readUpload(value: FormDataEntryValue | undefined, label: string) {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required`);
  }

  async function nextMembershipNumber() {
    const year = new Date().getFullYear();
    const prefix = `CPYF/${year}/`;
    const latest = await prisma.membership.findFirst({
      where: { membershipNo: { startsWith: prefix } },
      orderBy: { membershipNo: "desc" },
      select: { membershipNo: true },
    });
    const sequence = latest ? Number(latest.membershipNo.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(sequence).padStart(4, "0")}`;
  }
  if (value.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${label} must not exceed 25 KB`);
  }
  const bytes = Buffer.from(await value.arrayBuffer()).toString("base64");
  return `data:${value.type || "application/octet-stream"};base64,${bytes}`;
}

async function nextMembershipNumber() {
  const year = new Date().getFullYear();
  const prefix = `CPYF/${year}/`;
  const latest = await prisma.membership.findFirst({
    where: { membershipNo: { startsWith: prefix } },
    orderBy: { membershipNo: "desc" },
    select: { membershipNo: true },
  });
  const sequence = latest ? Number(latest.membershipNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let raw: Record<string, unknown>;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      raw = Object.fromEntries(form.entries());
      raw.passportPhoto = await readUpload(form.get("passportPhoto") ?? undefined, "Passport photograph");
      raw.identificationDocument = await readUpload(form.get("identificationDocument") ?? undefined, "Identification document");
    } else {
      raw = await request.json();
    }
    const parsed = registrationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration details", issues: parsed.error.issues }, { status: 400 });
    }

    const {
      firstName, lastName, email, phone, password, category, weeklyTarget,
      dateOfBirth, gender, address, state, localGovernment, nationality,
      occupation, incomeRange, emergencyName, emergencyPhone, emergencyRelationship,
      nomineeName, nomineePhone, nomineeRelationship, nomineeAddress,
      passportPhoto, identificationDocument,
    } = parsed.data;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Registration is not configured. Add DATABASE_URL to the deployment environment." }, { status: 503 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const membershipNo = await nextMembershipNumber();
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        address,
        state,
        localGovernment,
        nationality,
        occupation,
        incomeRange,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
        nomineeName,
        nomineePhone,
        nomineeRelationship,
        nomineeAddress,
        passportPhoto,
        identificationDocument,
        termsAcceptedAt: new Date(),
        passwordHash,
        membership: {
          create: {
            category,
            membershipNo,
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
