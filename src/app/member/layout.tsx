import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserLocal } from "@/lib/store";

export default async function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const user = await getSessionUserLocal(cookieStore.get("cpyif_session")?.value);

  if (!user) redirect("/#portal");
  if (user.role !== "MEMBER") redirect("/admin");

  return children;
}
