'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Category = {
  grade: 'ACTIVE' | 'SILVER' | 'GOLDEN';
  displayName: string;
  durationYears: number;
  loanMultiplier: number;
  minMembershipMonths: number;
  minimumSavings: number;
  automaticClassification: boolean;
};

export default function AdminSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Unable to load settings');
      const data = await response.json();
      setCategories(data.categories ?? []);
    }).catch((error) => setMessage(error.message));
  }, []);

  const save = async (category: Category) => {
    setMessage('Saving settings...');
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Settings update failed');
      return;
    }
    setCategories((current) => current.map((item) => item.grade === category.grade ? data.category : item));
    setMessage(`${category.displayName} settings saved.`);
  };

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]">
          <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative
        </Link>
        <div className="rounded-[2rem] bg-[#1d1234] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Admin Settings</p>
          <h1 className="mt-2 text-3xl font-bold">Membership Categories</h1>
          <p className="mt-2 max-w-3xl text-violet-100">Configure category durations, loan limits, eligibility waiting periods, and automatic classification.</p>
        </div>
        {message && <p className="mt-5 rounded-xl bg-violet-100 px-4 py-3 text-sm font-semibold text-[#4C1D95]">{message}</p>}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {categories.map((category) => (
            <section key={category.grade} className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">{category.displayName}</h2>
              <div className="mt-5 space-y-4">
                <label className="grid gap-1 text-sm font-semibold">Display name<input value={category.displayName} onChange={(e) => setCategories((all) => all.map((item) => item.grade === category.grade ? { ...item, displayName: e.target.value } : item))} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
                <label className="grid gap-1 text-sm font-semibold">Duration (years)<input type="number" min="0" value={category.durationYears} onChange={(e) => setCategories((all) => all.map((item) => item.grade === category.grade ? { ...item, durationYears: Number(e.target.value) } : item))} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
                <label className="grid gap-1 text-sm font-semibold">Loan multiplier<input type="number" min="1" step="0.5" value={category.loanMultiplier} onChange={(e) => setCategories((all) => all.map((item) => item.grade === category.grade ? { ...item, loanMultiplier: Number(e.target.value) } : item))} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
                <label className="grid gap-1 text-sm font-semibold">Minimum membership months<input type="number" min="0" value={category.minMembershipMonths} onChange={(e) => setCategories((all) => all.map((item) => item.grade === category.grade ? { ...item, minMembershipMonths: Number(e.target.value) } : item))} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
                <label className="grid gap-1 text-sm font-semibold">Minimum savings (₦)<input type="number" min="0" value={category.minimumSavings} onChange={(e) => setCategories((all) => all.map((item) => item.grade === category.grade ? { ...item, minimumSavings: Number(e.target.value) } : item))} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={category.automaticClassification} onChange={(e) => setCategories((all) => all.map((item) => item.grade === category.grade ? { ...item, automaticClassification: e.target.checked } : item))} /> Enable automatic classification</label>
                <button type="button" onClick={() => save(category)} className="w-full rounded-full bg-[#6A11CB] px-4 py-3 font-bold text-white">Save Category</button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
