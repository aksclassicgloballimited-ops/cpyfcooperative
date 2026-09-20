import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });

  await prisma.membership.update({
    where: { userId: user.id },
    data: { paymentSubmittedAt: new Date() },
  });

  return NextResponse.json({
    message: "Payment marked for review. Your membership remains pending until executive approval.",
  });
}
