import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { SESSION_COOKIE, readCookieFromHeader, sessionCookieOptions, sessionMaxAgeForRole, signSessionJwt, verifySessionJwt } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renews the short-lived session cookie. The client only calls this while the user is active.
export async function POST(request: Request) {
  const claims = await verifySessionJwt(readCookieFromHeader(request.headers.get("cookie"), SESSION_COOKIE));
  const user = claims ? await getUserFromRequest(request).catch(() => null) : null;
  if (!claims || !user) return NextResponse.json({ active: false }, { status: 401 });

  const token = await signSessionJwt({ sid: claims.sid, sub: user.id, role: user.role });
  const idleSeconds = sessionMaxAgeForRole(user.role);
  const response = NextResponse.json({ active: true, role: user.role, idleSeconds });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(idleSeconds));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
