import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessions } from "@/lib/store";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith("cpyif_session="));
  const token = cookie ? decodeURIComponent(cookie.slice("cpyif_session=".length)) : null;

  if (token && process.env.DATABASE_URL) {
    await prisma.session.deleteMany({ where: { token } });
  }
  if (token) sessions.delete(token);

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.set("cpyif_session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
