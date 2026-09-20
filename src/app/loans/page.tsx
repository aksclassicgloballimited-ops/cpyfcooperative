'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Product = { id: string; name: string; type: string; maximumAmount: number; minimumAmount: number; processingFeeType: string; processingFeeValue: number; repaymentPeriod: number; repaymentFrequency: string; eligibilityRequirements: string; requiredSavings: number; requiredShares: number; guarantorRequirements: string; documentationRequirements: string; terms: string };

export default function LoansPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [amount, setAmount] = useState('100000');
  const [period, setPeriod] = useState('12');
  const [selected, setSelected] = useState<Product | null>(null);
  useEffect(() => { fetch('/api/loan-products').then((r) => r.json()).then((data) => setProducts(data.products ?? [])).catch(() => setProducts([])); }, []);
  const fee = selected ? selected.processingFeeType === 'PERCENTAGE' ? Number(amount) * selected.processingFeeValue / 100 : selected.processingFeeValue : 0;
  const total = Number(amount) + fee;
  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="rounded-[2rem] bg-gradient-to-r from-[#4C1D95] to-[#8b5cf6] p-8 text-white"><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Interest-Free Financing</p><h1 className="mt-2 text-4xl font-black">Loan Plans</h1><p className="mt-3 max-w-2xl text-violet-100">Review the cooperative's products, calculate your repayment, and submit a guided application.</p></div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">{products.map((product) => <article key={product.id} className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-bold">{product.name}</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Available</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-slate-500">Amount</span><b>₦{product.minimumAmount.toLocaleString()}–₦{product.maximumAmount.toLocaleString()}</b></p><p><span className="block text-slate-500">Repayment</span><b>{product.repaymentPeriod} {product.repaymentFrequency}</b></p><p><span className="block text-slate-500">Processing fee</span><b>{product.processingFeeType === 'PERCENTAGE' ? `${product.processingFeeValue}%` : `₦${product.processingFeeValue.toLocaleString()}`}</b></p><p><span className="block text-slate-500">Required shares</span><b>{product.requiredShares} units</b></p></div><div className="mt-5 space-y-2 text-sm text-slate-600"><p><b>Eligibility:</b> {product.eligibilityRequirements}</p><p><b>Guarantor:</b> {product.guarantorRequirements}</p><p><b>Documents:</b> {product.documentationRequirements}</p></div><div className="mt-6 flex gap-2"><Link href={`/loans/apply?type=${product.type}&product=${product.id}`} className="flex-1 rounded-full bg-[#6A11CB] px-4 py-3 text-center text-sm font-bold text-white">Apply Online</Link><button type="button" onClick={() => setSelected(product)} className="rounded-full border border-violet-200 px-4 py-3 text-sm font-bold text-[#6A11CB]">Calculate</button></div></article>)}</div>
        {selected && <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">{selected.name} Calculator</h2><button type="button" onClick={() => setSelected(null)} className="text-sm font-bold text-slate-500">Close</button></div><div className="mt-5 grid gap-4 md:grid-cols-3"><label className="grid gap-2 text-sm font-semibold">Loan amount<input type="number" min={selected.minimumAmount} max={selected.maximumAmount} value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /></label><label className="grid gap-2 text-sm font-semibold">Repayment period (months)<input type="number" min="1" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /></label><div className="rounded-xl bg-violet-50 p-4"><p className="text-sm text-slate-600">Estimated installment</p><p className="mt-2 text-2xl font-black text-[#6A11CB]">₦{(total / Math.max(1, Number(period))).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p><p className="mt-1 text-xs text-slate-500">Principal ₦{Number(amount).toLocaleString()} + fee ₦{fee.toLocaleString()}</p></div></div><Link href={`/loans/apply?type=${selected.type}&product=${selected.id}`} className="mt-5 inline-flex rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white">Continue Application</Link></section>}
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/member" className="rounded-full border border-violet-200 bg-white px-5 py-3 font-bold text-[#6A11CB]">Member Dashboard</Link><Link href="/admin/loans" className="rounded-full border border-violet-200 bg-white px-5 py-3 font-bold text-[#6A11CB]">Admin Loan Management</Link></div>
      </div>
    </main>
  );
}
