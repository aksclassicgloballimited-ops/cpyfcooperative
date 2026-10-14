import { redirect } from "next/navigation";
import { getAdminPageRole } from "@/lib/admin-page-auth";

export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getAdminPageRole();
  if (!role || !["SUPER_ADMIN", "EXECUTIVE"].includes(role)) redirect("/admin");
  return children;
}
