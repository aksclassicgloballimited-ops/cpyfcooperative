import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({ where: { userId: user.id }, data: { paymentSubmittedAt: new Date() } });
    await tx.notification.create({ data: { userId: user.id, title: "Payment confirmation", body: "Your registration payment has been submitted for review." } });
  });

  return NextResponse.json({
    message: "Payment marked for review. Your membership remains pending until executive approval.",
  });
}
