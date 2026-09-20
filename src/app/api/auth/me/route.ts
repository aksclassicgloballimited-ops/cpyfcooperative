import { NextResponse } from "next/server";
import { getSessionUserLocal } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { MembershipGrade } from "@prisma/client";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("cpyif_session="));

  const token = cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
  const user = await getSessionUserLocal(token);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const joinedAt = user.membership && "joinedAt" in user.membership ? user.membership.joinedAt : null;
  if (process.env.DATABASE_URL && user.membership?.status === "ACTIVE" && joinedAt) {
    const configs = await prisma.membershipCategoryConfig.findMany();
    const automatic = configs.some((config) => config.automaticClassification);
    if (automatic) {
      const years = (Date.now() - joinedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const desired = years >= 7 ? MembershipGrade.GOLDEN : years >= 2 ? MembershipGrade.SILVER : MembershipGrade.ACTIVE;
      if (desired !== user.membership.grade) {
        const updatedMembership = await prisma.membership.update({
          where: { userId: user.id },
          data: { grade: desired },
        });
        user.membership = updatedMembership;
      }
    }
  }

  const { passwordHash, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 200 });
}
