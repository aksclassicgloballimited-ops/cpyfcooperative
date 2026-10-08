import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cpyf_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 60;
export const MEMBER_SESSION_MAX_AGE_SECONDS = 15 * 60;

// Idle limits: staff 30 minutes, members 15 minutes. The session is renewed only while the user is active.
export const sessionMaxAgeForRole = (role: string) => (role === "MEMBER" ? MEMBER_SESSION_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS);

export type SessionClaims = { sid: string; sub: string; role: string };

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
};

export const isJwtConfigured = () => getSecret() !== null;

export const signSessionJwt = async (claims: SessionClaims) => {
  const secret = getSecret();
  if (!secret) throw new Error("JWT_SECRET is not configured (minimum 32 characters).");
  return new SignJWT({ sid: claims.sid, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAgeForRole(claims.role)}s`)
    .sign(secret);
};

export const verifySessionJwt = async (token?: string | null): Promise<SessionClaims | null> => {
  const secret = getSecret();
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string" || typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sid: payload.sid, sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
};

export const sessionCookieOptions = (maxAge = SESSION_MAX_AGE_SECONDS) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export const readCookieFromHeader = (cookieHeader: string | null, name: string) => {
  const prefix = `${name}=`;
  const found = (cookieHeader ?? "").split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
};

// Returns the server-side session id only when the signed JWT is valid and unexpired.
export const getSessionIdFromJwtCookie = async (cookieValue?: string | null) => {
  const claims = await verifySessionJwt(cookieValue);
  return claims?.sid ?? null;
};
