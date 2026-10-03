'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirm) {
      setStatus('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      setStatus(data.message || data.error || 'Request failed');
      if (response.ok) setDone(true);
    } catch {
      setStatus('Unable to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'rounded-xl border border-violet-200 px-3 py-2.5 outline-none transition focus:border-[#6A11CB]';

  return (
    <div className="w-full max-w-md rounded-[2rem] bg-white/95 p-8 shadow-2xl">
      <Link href="/" className="flex items-center gap-3 text-sm font-bold text-[#6A11CB]">
        <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={44} height={44} className="rounded-full" />
        CPYIF Cooperative
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-[#1d1731]">Choose a New Password</h1>
      {!token ? (
        <p className="mt-4 text-sm text-rose-600">This reset link is invalid. <Link href="/forgot-password" className="font-semibold underline">Request a new one</Link>.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">New password
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Confirm password
            <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
          </label>
          {status && <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-[#4C1D95]">{status}</div>}
          {done ? (
            <Link href="/#portal" className="rounded-full bg-[#6A11CB] px-5 py-3 text-center font-bold text-white">Go to Member Login</Link>
          ) : (
            <button type="submit" disabled={submitting} className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white disabled:opacity-60">{submitting ? 'Saving...' : 'Reset Password'}</button>
          )}
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6A11CB] to-[#1d1234] px-4 py-12">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
