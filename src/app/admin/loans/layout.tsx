import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { getAdminPageRole } from "@/lib/admin-page-auth";

export default async function LoansLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getAdminPageRole();
  if (!role || !can(role, "loans")) redirect("/admin");
  return children;
}
