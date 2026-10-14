import { cookies } from "next/headers";
import { getSessionUserLocal } from "@/lib/store";
import { SESSION_COOKIE, getSessionIdFromJwtCookie } from "@/lib/jwt";

export async function getAdminPageRole() {
  const cookieStore = await cookies();
  const token = await getSessionIdFromJwtCookie(cookieStore.get(SESSION_COOKIE)?.value);
  const user = await getSessionUserLocal(token).catch(() => null);
  return user?.role || null;
}
