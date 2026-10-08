'use client';

import Image from 'next/image';

type Props = { status: string; paymentSubmitted: boolean };

export default function MembershipReviewNotice({ status, paymentSubmitted }: Props) {
  const content = status === 'SUSPENDED'
    ? { title: 'Membership suspended', body: 'Your membership is currently suspended. Please contact the cooperative management for assistance.' }
    : status === 'REJECTED'
      ? { title: 'Application not approved', body: 'Your membership application was not approved. Please contact the cooperative management for details.' }
      : {
          title: 'Registration under review',
          body: paymentSubmitted
            ? 'Your registration is under review by the management. Once your payment is verified and your membership is approved, you will receive your membership number. Please check back later.'
            : 'Your registration has been received. Complete your registration payment so the management can verify it. Once your payment is verified and your membership is approved, you will receive your membership number.',
        };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/#portal';
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ff] px-4 py-10 text-[#1d1731]">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-sm sm:p-10">
        <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={72} height={72} className="mx-auto rounded-full" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#6A11CB]">Member portal</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{content.title}</h1>
        <p className="mt-4 leading-7 text-slate-600">{content.body}</p>
        <p className="mt-3 text-sm font-semibold text-slate-500">No activity is available on the portal until your membership is approved.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {status === 'PENDING' && !paymentSubmitted && <a href="/payment" className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white">Make payment</a>}
          <a href="/member" className="rounded-full border border-violet-200 px-5 py-3 font-bold text-[#6A11CB]">Refresh status</a>
          <button type="button" onClick={logout} className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-600">Logout</button>
        </div>
      </section>
    </main>
  );
}
