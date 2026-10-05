import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionJwt } from "@/lib/jwt";

const redirectTo = (request: NextRequest, path: string) => {
  const url = request.nextUrl.clone();
  const [pathname, hash] = path.split("#");
  url.pathname = pathname;
  url.search = "";
  url.hash = hash ? `#${hash}` : "";
  const response = NextResponse.redirect(url);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/logout") return NextResponse.next();

  const claims = await verifySessionJwt(request.cookies.get(SESSION_COOKIE)?.value);
  const isMemberArea = pathname === "/member" || pathname.startsWith("/member/");

  if (!claims) return redirectTo(request, isMemberArea ? "/#portal" : "/check/verify/admin_login");
  if (isMemberArea && claims.role !== "MEMBER") return NextResponse.redirect(new URL("/admin", request.url));
  if (!isMemberArea && claims.role === "MEMBER") return NextResponse.redirect(new URL("/member", request.url));

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*", "/member/:path*"] };
