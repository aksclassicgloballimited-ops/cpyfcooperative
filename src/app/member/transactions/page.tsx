'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Row = { id: string; reference: string; createdAt: string; description: string; amount: number; type: string; status: string; balanceAfter?: number | null };
export default function TransactionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch('/api/transactions').then((r) => r.json()).then((data) => { const financial = (data.transactions ?? []).map((item: Row) => ({ ...item, id: item.id })); setRows(financial); }); }, []);
  return <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><Link href="/member" className="font-bold text-[#6A11CB]">← Back to dashboard</Link><div className="mt-5 rounded-[2rem] bg-[#1d1234] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Financial Records</p><h1 className="mt-2 text-3xl font-bold">Transaction History</h1></div><section className="mt-6 overflow-x-auto rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Transaction ID</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Balance</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-violet-100"><td className="px-4 py-3 font-mono text-xs">{row.reference}</td><td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{row.description}</td><td className="px-4 py-3">{row.type}</td><td className="px-4 py-3 font-bold">₦{Number(row.amount).toLocaleString()}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">₦{Number(row.balanceAfter || 0).toLocaleString()}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-slate-500">No transactions found.</p>}</section></div></main>;
}
