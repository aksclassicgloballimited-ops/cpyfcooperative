'use client';

import Link from 'next/link';
import Image from 'next/image';

const shareSummary = [
  { label: 'Current Units', value: '12 Units', tone: 'bg-violet-50 text-[#6A11CB]' },
  { label: 'Market Value', value: '₦420,000', tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Quarterly Dividend', value: '₦18,000', tone: 'bg-amber-50 text-amber-600' },
  { label: 'Share Grade', value: 'Silver', tone: 'bg-sky-50 text-sky-600' },
];

const dividendHistory = [
  { period: 'Q1 2026', payout: '₦18,000', status: 'Credited' },
  { period: 'Q4 2025', payout: '₦15,600', status: 'Credited' },
  { period: 'Q3 2025', payout: '₦14,400', status: 'Credited' },
  { period: 'Q2 2025', payout: '₦12,000', status: 'Credited' },
];

const certificateHighlights = [
  'Non-transferable cooperative share certificate',
  'Earns dividends on quarterly basis',
  'Eligible for cooperative governance participation',
  'Supports member welfare and business development',
];

export default function SharesPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white shadow-[0_18px_60px_rgba(76,29,149,0.22)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Portal</p>
            <h1 className="mt-2 text-3xl font-bold">Shares & Dividends</h1>
          </div>
          <Link href="/member" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {shareSummary.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</div>
              <div className="mt-4 text-3xl font-bold text-[#1d1731]">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1d1731]">Dividend History</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">Quarterly</span>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-violet-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50 text-[#4C1D95]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Period</th>
                    <th className="px-4 py-3 font-bold">Payout</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dividendHistory.map((item) => (
                    <tr key={item.period} className="border-t border-violet-100">
                      <td className="px-4 py-3 font-medium text-[#1d1731]">{item.period}</td>
                      <td className="px-4 py-3 font-semibold text-[#1d1731]">{item.payout}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1d1731]">Share Certificate</h2>
            <div className="mt-5 rounded-[1.5rem] bg-gradient-to-r from-[#1d1234] to-[#4C1D95] p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">CPYIF</p>
              <h3 className="mt-3 text-2xl font-bold">Certificate of Shares</h3>
              <div className="mt-6 space-y-2 text-sm text-violet-100">
                <div className="flex justify-between"><span>Member</span><span className="font-semibold text-white">Ada Musa</span></div>
                <div className="flex justify-between"><span>Units</span><span className="font-semibold text-white">12</span></div>
                <div className="flex justify-between"><span>Grade</span><span className="font-semibold text-white">Silver</span></div>
                <div className="flex justify-between"><span>Member No</span><span className="font-semibold text-white">CPYF-1789822284234</span></div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {certificateHighlights.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl bg-violet-50 p-3 text-sm text-slate-700">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#6A11CB]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
