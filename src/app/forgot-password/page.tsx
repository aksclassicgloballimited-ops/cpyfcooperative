'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [membershipNo, setMembershipNo] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, membershipNo }),
      });
      const data = await response.json();
      setStatus(data.message || data.error || 'Request failed');
    } catch {
      setStatus('Unable to send the request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'rounded-xl border border-violet-200 px-3 py-2.5 outline-none transition focus:border-[#6A11CB]';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6A11CB] to-[#1d1234] px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] bg-white/95 p-8 shadow-2xl">
        <Link href="/" className="flex items-center gap-3 text-sm font-bold text-[#6A11CB]">
          <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={44} height={44} className="rounded-full" />
          CPYIF Cooperative
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-[#1d1731]">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your registered email and membership number. We will email you a link to reset your password.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Registered email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Membership number
            <input required value={membershipNo} onChange={(e) => setMembershipNo(e.target.value)} placeholder="CPYF/2026/0001" className={field} />
          </label>
          {status && <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-[#4C1D95]">{status}</div>}
          <button type="submit" disabled={submitting} className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white disabled:opacity-60">
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500"><Link href="/#portal" className="font-semibold text-[#6A11CB]">Back to Member Login</Link></p>
      </div>
    </main>
  );
}
