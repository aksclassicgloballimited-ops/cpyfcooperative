'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Holding = { id: string; units: number; unitPrice: number };
type ShareTransaction = { id: string; units: number; unitPrice: number; type: string; description: string; createdAt: string };

export default function SharesPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<ShareTransaction[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/shares', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load shares');
      setHoldings(data.holdings ?? []);
      setTransactions(data.transactions ?? []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load shares'));
  }, []);
  const units = holdings.reduce((sum, item) => sum + item.units, 0);
  const value = holdings.reduce((sum, item) => sum + item.units * item.unitPrice, 0);
  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Portal</p><h1 className="mt-2 text-3xl font-bold">Shares</h1></div><Link href="/member" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Back to Dashboard</Link></div>
        {error && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="grid gap-5 md:grid-cols-3">{[['Total Shares', `${units} units`], ['Share Value', `₦${value.toLocaleString()}`], ['Transactions', String(transactions.length)]].map(([label, amount]) => <div key={label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6A11CB]">{label}</p><p className="mt-4 text-2xl font-bold">{amount}</p></div>)}</div>
        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-2xl font-bold">Share Purchase History</h2><div className="overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Units</th><th className="px-4 py-3">Unit Price</th><th className="px-4 py-3">Type</th></tr></thead><tbody>{transactions.map((entry) => <tr key={entry.id} className="border-t border-violet-100"><td className="px-4 py-3">{new Date(entry.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{entry.description}</td><td className="px-4 py-3 font-bold">{entry.units}</td><td className="px-4 py-3">₦{entry.unitPrice.toLocaleString()}</td><td className="px-4 py-3">{entry.type}</td></tr>)}</tbody></table>{!transactions.length && <p className="p-8 text-center text-sm text-slate-500">No share transactions have been recorded yet.</p>}</div></section>
      </div>
    </main>
  );
}
