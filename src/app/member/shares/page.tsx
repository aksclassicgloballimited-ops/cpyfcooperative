'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Holding = { id: string; units: number; unitPrice: number };
type ShareRequest = { id: string; units: number; totalAmount: number; transactionNo?: string | null; status: string; createdAt: string; rejectionReason?: string | null };
type ShareTransaction = { id: string; units: number; unitPrice: number; type: string; description: string; createdAt: string };

export default function SharesPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<ShareTransaction[]>([]);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<ShareRequest[]>([]);
  const [unitPrice, setUnitPrice] = useState(10000);
  const [units, setUnits] = useState('');
  const [transactionNo, setTransactionNo] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    const response = await fetch('/api/shares', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load shares');
    setHoldings(data.holdings ?? []);
    setTransactions(data.transactions ?? []);
    const requestsResponse = await fetch('/api/shares/requests', { cache: 'no-store' });
    if (requestsResponse.ok) { const requestData = await requestsResponse.json(); setRequests(requestData.requests ?? []); setUnitPrice(Number(requestData.unitPrice || 10000)); }
  };
  useEffect(() => { load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load shares')); }, []);
  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage('Submitting share purchase for approval...');
    const form = new FormData(); form.set('units', units); form.set('transactionNo', transactionNo); if (receipt) form.set('receipt', receipt);
    const response = await fetch('/api/shares/requests', { method: 'POST', body: form }); const data = await response.json();
    setMessage(response.ok ? 'Submitted. Your share units will be added after the financial officer approves the payment.' : data.error || 'Submission failed');
    if (response.ok) { setUnits(''); setTransactionNo(''); setReceipt(null); load().catch(() => undefined); }
  };
  const totalUnits = holdings.reduce((sum, item) => sum + item.units, 0);
  const value = holdings.reduce((sum, item) => sum + item.units * item.unitPrice, 0);
  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Portal</p><h1 className="mt-2 text-3xl font-bold">Shares</h1></div><Link href="/member" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Back to Dashboard</Link></div>
        {error && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="grid gap-5 md:grid-cols-3">{[['Total Shares', `${totalUnits} units`], ['Share Value', `₦${value.toLocaleString()}`], ['Transactions', String(transactions.length)]].map(([label, amount]) => <div key={label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6A11CB]">{label}</p><p className="mt-4 text-2xl font-bold">{amount}</p></div>)}</div>
        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Buy Shares</h2>
          <p className="mt-2 text-sm text-slate-600">Each share unit costs ₦{unitPrice.toLocaleString()}. Pay into the cooperative account below, then submit your receipt or bank transaction number. Units are added only after the financial officer approves.</p>
          <div className="mt-4 rounded-2xl bg-violet-50 p-4 text-sm"><p className="font-bold text-[#4C1D95]">Cooperative payment account</p><p className="mt-2">Bank: UBA</p><p>Account number: 2331842430</p><p>Account name: Circle of Prosperous Youth Forum</p></div>
          <form onSubmit={submitRequest} className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">Share units<input required type="number" min="1" step="1" value={units} onChange={(event) => setUnits(event.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /><span className="text-xs font-normal text-slate-500">Amount to pay: ₦{(Number(units || 0) * unitPrice).toLocaleString()}</span></label>
            <label className="grid gap-2 text-sm font-semibold">Bank transaction number<input value={transactionNo} onChange={(event) => setTransactionNo(event.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
            <label className="grid gap-2 text-sm font-semibold">Payment receipt<input type="file" accept="image/*,.pdf" onChange={(event) => setReceipt(event.target.files?.[0] || null)} className="rounded-xl border border-violet-200 px-3 py-2 text-sm" /></label>
            <div className="md:col-span-3"><button className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white">Submit for Approval</button></div>
          </form>
          {message && <p className="mt-4 rounded-xl bg-violet-100 px-4 py-3 text-sm font-semibold text-[#4C1D95]">{message}</p>}
          {requests.length > 0 && <div className="mt-6 overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Units</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{requests.map((item) => <tr key={item.id} className="border-t border-violet-100"><td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString()}</td><td className="px-4 py-3 font-bold">{item.units}</td><td className="px-4 py-3">₦{item.totalAmount.toLocaleString()}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : item.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{item.status === 'PENDING' ? 'Pending finance approval' : item.status}</span></td></tr>)}</tbody></table></div>}
        </section>
        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-2xl font-bold">Share Purchase History</h2><div className="overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Units</th><th className="px-4 py-3">Unit Price</th><th className="px-4 py-3">Type</th></tr></thead><tbody>{transactions.map((entry) => <tr key={entry.id} className="border-t border-violet-100"><td className="px-4 py-3">{new Date(entry.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{entry.description}</td><td className="px-4 py-3 font-bold">{entry.units}</td><td className="px-4 py-3">₦{entry.unitPrice.toLocaleString()}</td><td className="px-4 py-3">{entry.type}</td></tr>)}</tbody></table>{!transactions.length && <p className="p-8 text-center text-sm text-slate-500">No share transactions have been recorded yet.</p>}</div></section>
      </div>
    </main>
  );
}
