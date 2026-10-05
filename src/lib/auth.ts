import { getSessionUserLocal } from "@/lib/store";
import { SESSION_COOKIE, getSessionIdFromJwtCookie, readCookieFromHeader } from "@/lib/jwt";

export const getSessionTokenFromRequest = async (request: Request) =>
  getSessionIdFromJwtCookie(readCookieFromHeader(request.headers.get("cookie"), SESSION_COOKIE));

export const getUserFromRequest = async (request: Request) => {
  const token = await getSessionTokenFromRequest(request);
  return await getSessionUserLocal(token);
};
