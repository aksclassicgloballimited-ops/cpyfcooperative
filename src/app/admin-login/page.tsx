'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('Verifying admin access...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      if (!ALLOWED_ROLES.includes(data.user?.role)) {
        await fetch('/api/auth/logout', { method: 'POST' });
        throw new Error('Invalid login details.');
      }

      setStatus('Access granted. Redirecting to the admin dashboard...');
      router.replace('/admin');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1d1234] via-[#4C1D95] to-[#6A11CB] px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/95 p-8 shadow-2xl">
        <Link href="/" className="flex items-center gap-3 text-sm font-bold text-[#6A11CB]">
          <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={44} height={44} className="rounded-full" />
          CPYIF Cooperative
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#6A11CB]">Admin Portal</p>
        <h1 className="mt-2 text-3xl font-bold text-[#1d1731]">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Restricted access. This login is reserved for Administrators and Super Administrators only.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Admin Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-violet-200 px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-violet-200 px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
            />
          </label>

          {status && (
            <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-[#4C1D95]">{status}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white transition hover:bg-[#5b0fc4] disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Not an administrator?{' '}
          <Link href="/executive-login" className="font-semibold text-[#6A11CB]">
            Go to Executive Login
          </Link>
        </p>
      </div>
    </main>
  );
}
