import { redirect } from "next/navigation";
import { getAdminPageRole } from "@/lib/admin-page-auth";

export default async function LoanRecordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await getAdminPageRole();
  if (!role || !["SUPER_ADMIN", "FINANCE_OFFICER", "LOAN_OFFICER"].includes(role)) redirect("/admin");
  return children;
}
