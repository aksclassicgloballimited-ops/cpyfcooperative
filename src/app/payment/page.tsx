'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Member = {
  membership?: {
    membershipNo?: string;
    category?: string;
    status?: string;
    paymentSubmittedAt?: string | null;
  };
};

export default function PaymentPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) {
        window.location.href = '/#portal';
        return;
      }
      const data = await response.json();
      setMember(data.user);
    });
  }, []);

  const fee = member?.membership?.category === 'NON_APPEARANCE' ? '₦15,000' : '₦10,000';

  const confirmPayment = async () => {
    const response = await fetch('/api/membership/payment', { method: 'POST' });
    const data = await response.json();
    setMessage(response.ok ? data.message : (data.error || 'Unable to submit payment'));
  };

  return (
    <main className="min-h-screen bg-[#f7f4ff] px-4 py-8 text-[#1d1731] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between rounded-2xl bg-[#1d1234] px-5 py-4 text-white">
          <a href="/" className="flex items-center gap-3">
            <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={44} height={44} className="rounded-full border border-white/40 object-cover" />
            <span className="font-bold">CPYIF Cooperative</span>
          </a>
          <a href="/member" className="text-sm font-semibold text-violet-100">Member portal</a>
        </header>
        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6A11CB]">Registration payment</p>
          <h1 className="mt-2 text-3xl font-bold">Complete your membership payment</h1>
          <p className="mt-3 text-slate-600">Transfer the registration fee below. Your membership will remain pending until an executive or administrator verifies and approves your application.</p>
          <div className="mt-6 rounded-2xl bg-violet-50 p-5">
            <div className="text-sm font-semibold text-slate-600">Registration fee</div>
            <div className="mt-1 text-3xl font-bold text-[#6A11CB]">{fee}</div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-slate-500">Bank</dt><dd className="font-bold">UBA</dd></div>
              <div><dt className="font-semibold text-slate-500">Account number</dt><dd className="font-bold">2331842430</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Account name</dt><dd className="font-bold">Circle of Prosperous Youth Forum</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Membership number</dt><dd className="font-bold">{member?.membership?.membershipNo || 'Loading...'}</dd></div>
            </dl>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={confirmPayment} className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white">I have made the payment</button>
            <a href="/member" className="rounded-full border border-violet-200 px-5 py-3 font-bold text-[#6A11CB]">Go to member portal</a>
          </div>
          {message && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</p>}
        </section>
      </div>
    </main>
  );
}
