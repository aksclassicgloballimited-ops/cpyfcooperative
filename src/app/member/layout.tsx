import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserLocal } from "@/lib/store";
import { SESSION_COOKIE, getSessionIdFromJwtCookie } from "@/lib/jwt";
import MembershipReviewNotice from "@/components/MembershipReviewNotice";

export default async function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const user = await getSessionUserLocal(await getSessionIdFromJwtCookie(cookieStore.get(SESSION_COOKIE)?.value)).catch(() => null);

  if (!user) redirect("/#portal");
  if (user.role !== "MEMBER") redirect("/admin");

  const membership = user.membership as { status?: string; paymentSubmittedAt?: Date | string | null } | null | undefined;
  if (membership?.status !== "ACTIVE") {
    return <MembershipReviewNotice status={membership?.status ?? "PENDING"} paymentSubmitted={Boolean(membership?.paymentSubmittedAt)} />;
  }

  return children;
}
