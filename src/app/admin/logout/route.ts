import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessions } from "@/lib/store";
import { SESSION_COOKIE, getSessionIdFromJwtCookie, readCookieFromHeader } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function logout(request: Request) {
  const sid = await getSessionIdFromJwtCookie(readCookieFromHeader(request.headers.get("cookie"), SESSION_COOKIE));
  if (sid) {
    sessions.delete(sid);
    if (process.env.DATABASE_URL) await prisma.session.deleteMany({ where: { token: sid } }).catch(() => undefined);
  }

  const response = NextResponse.redirect(new URL("/check/verify/admin_login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const GET = logout;
export const POST = logout;
