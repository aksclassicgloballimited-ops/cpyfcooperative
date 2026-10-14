import { redirect } from "next/navigation";
import { getAdminPageRole } from "@/lib/admin-page-auth";

export default async function LoanAccessLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (await getAdminPageRole() !== "SUPER_ADMIN") redirect("/admin");
  return children;
}
