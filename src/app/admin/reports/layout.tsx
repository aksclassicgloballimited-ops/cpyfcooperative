import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { getAdminPageRole } from "@/lib/admin-page-auth";

export default async function ReportsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getAdminPageRole();
  if (!role || !can(role, "reports")) redirect("/admin");
  return children;
}
