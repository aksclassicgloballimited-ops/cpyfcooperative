'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Entry = { id: string; createdAt: string; description: string; amount: number; status: string; balanceAfter?: number | null; reversedAt?: string | null };

export default function SavingsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/savings', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Unable to load savings'); return; }
    setEntries(data.transactions ?? []);
    setTotal(Number(data.totalSavings || 0));
  };
  useEffect(() => { load().catch(() => setError('Unable to load savings')); }, []);

  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Portal</p><h1 className="mt-2 text-3xl font-bold">Weekly Savings</h1></div>
          <Link href="/member" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Back to Dashboard</Link>
        </div>
        {error && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="grid gap-5 md:grid-cols-3">
          {[['Total Savings', `₦${total.toLocaleString()}`], ['Weekly Requirement', 'Configured by administrator'], ['Payment Status', entries.length ? 'Transactions recorded' : 'No payments recorded']].map(([label, value]) => <div key={label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6A11CB]">{label}</p><p className="mt-4 text-2xl font-bold">{value}</p></div>)}
        </div>
        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">Savings History & Audit Trail</h2><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-[#6A11CB]">{entries.length} transactions</span></div>
          <div className="overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Balance</th></tr></thead>
              <tbody>{entries.map((entry) => <tr key={entry.id} className="border-t border-violet-100"><td className="px-4 py-3">{new Date(entry.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{entry.description}</td><td className={`px-4 py-3 font-bold ${entry.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₦{entry.amount.toLocaleString()}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{entry.reversedAt ? 'REVERSED' : entry.status}</span></td><td className="px-4 py-3">₦{Number(entry.balanceAfter || 0).toLocaleString()}</td></tr>)}</tbody>
            </table>
            {!entries.length && <p className="p-8 text-center text-sm text-slate-500">No savings transactions have been posted yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
