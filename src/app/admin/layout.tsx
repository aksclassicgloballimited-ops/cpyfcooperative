import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserLocal } from "@/lib/store";
import { isStaff } from "@/lib/permissions";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const user = await getSessionUserLocal(cookieStore.get("cpyif_session")?.value);

  if (!user) redirect("/admin-login");
  if (!isStaff(user.role)) redirect("/member");

  return children;
}
