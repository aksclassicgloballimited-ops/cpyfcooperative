import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessions } from "@/lib/store";
import { SESSION_COOKIE, getSessionIdFromJwtCookie, readCookieFromHeader } from "@/lib/jwt";

export async function POST(request: Request) {
  const sid = await getSessionIdFromJwtCookie(readCookieFromHeader(request.headers.get("cookie"), SESSION_COOKIE));

  if (sid && process.env.DATABASE_URL) await prisma.session.deleteMany({ where: { token: sid } });
  if (sid) sessions.delete(sid);

  const response = NextResponse.json({ message: "Logged out successfully" });
  for (const name of [SESSION_COOKIE, "cpyif_session"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
