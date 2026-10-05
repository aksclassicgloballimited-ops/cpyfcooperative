import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserLocal } from "@/lib/store";
import { SESSION_COOKIE, getSessionIdFromJwtCookie } from "@/lib/jwt";
import { isStaff } from "@/lib/permissions";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const user = await getSessionUserLocal(await getSessionIdFromJwtCookie(cookieStore.get(SESSION_COOKIE)?.value)).catch(() => null);

  if (!user) redirect("/check/verify/admin_login");
  if (!isStaff(user.role)) redirect("/member");

  return children;
}
