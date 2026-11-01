import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { effectiveStatus } from "@/lib/idcard-rules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ID Card Verification | CPYIF", robots: { index: false, follow: false } };

const STATUS_STYLE = {
  ACTIVE: { label: "VALID", color: "bg-emerald-100 text-emerald-800", note: "This membership ID card is valid." },
  EXPIRED: { label: "EXPIRED", color: "bg-amber-100 text-amber-800", note: "This membership ID card has expired." },
  SUSPENDED: { label: "SUSPENDED", color: "bg-orange-100 text-orange-800", note: "This membership ID card is currently suspended." },
  REVOKED: { label: "REVOKED", color: "bg-rose-100 text-rose-800", note: "This membership ID card has been revoked." },
} as const;

export default async function VerifyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = /^[a-f0-9]{48}$/.test(token)
    ? await prisma.idCard.findUnique({ where: { verifyToken: token }, select: { status: true, expiryDate: true, user: { select: { firstName: true, lastName: true, membership: { select: { membershipNo: true } } } } } })
    : null;
  const status = card ? STATUS_STYLE[effectiveStatus(card, new Date())] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ff] px-4 py-10 text-[#1d1731]">
      <section className="w-full max-w-md rounded-[2rem] border border-violet-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6A11CB]">CPYIF Interest-Free Cooperative</p>
        <h1 className="mt-2 text-2xl font-bold">Membership ID Verification</h1>
        {card && status ? (
          <>
            <p className={`mt-6 inline-block rounded-full px-5 py-2 text-lg font-black ${status.color}`}>{status.label}</p>
            <p className="mt-3 text-sm text-slate-600">{status.note}</p>
            <dl className="mt-6 grid gap-3 rounded-2xl bg-violet-50 p-5 text-left text-sm">
              <div><dt className="text-xs font-bold uppercase text-[#6A11CB]">Name</dt><dd className="font-semibold">{card.user.firstName} {card.user.lastName}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-[#6A11CB]">Membership ID</dt><dd className="font-semibold">{card.user.membership?.membershipNo}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-[#6A11CB]">Expiry date</dt><dd className="font-semibold">{card.expiryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}</dd></div>
            </dl>
          </>
        ) : (
          <>
            <p className="mt-6 inline-block rounded-full bg-rose-100 px-5 py-2 text-lg font-black text-rose-800">NOT FOUND</p>
            <p className="mt-3 text-sm text-slate-600">This QR code does not match any CPYIF membership ID card.</p>
          </>
        )}
        <p className="mt-6 text-xs text-slate-500">Only the minimum details needed for verification are shown.</p>
      </section>
    </main>
  );
}
