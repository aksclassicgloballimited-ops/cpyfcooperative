'use client';

import Link from 'next/link';
import Image from 'next/image';

const reportCards = [
  { label: 'Savings Collection', value: '₦7.8M', tone: 'bg-violet-50 text-[#6A11CB]' },
  { label: 'Loan Portfolio', value: '₦4.2M', tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Dividend Payout', value: '₦2.1M', tone: 'bg-amber-50 text-amber-600' },
  { label: 'Active Members', value: '248', tone: 'bg-sky-50 text-sky-600' },
];

const reportRows = [
  { month: 'Jan', savings: '₦1.4M', loans: '₦720K', compliance: '92%' },
  { month: 'Feb', savings: '₦1.6M', loans: '₦810K', compliance: '94%' },
  { month: 'Mar', savings: '₦1.8M', loans: '₦910K', compliance: '96%' },
  { month: 'Apr', savings: '₦2.1M', loans: '₦1.1M', compliance: '95%' },
  { month: 'May', savings: '₦2.3M', loans: '₦1.2M', compliance: '97%' },
];

export default function AdminReportsPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-[#1d1234] p-6 text-white shadow-[0_18px_60px_rgba(29,18,52,0.22)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Executive Reports</p>
            <h1 className="mt-2 text-3xl font-bold">CPYIF Financial Overview</h1>
          </div>
          <Link href="/admin" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {reportCards.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</div>
              <div className="mt-4 text-3xl font-bold text-[#1d1731]">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1d1731]">Monthly Performance</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">2026</span>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-violet-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50 text-[#4C1D95]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Month</th>
                    <th className="px-4 py-3 font-bold">Savings</th>
                    <th className="px-4 py-3 font-bold">Loans</th>
                    <th className="px-4 py-3 font-bold">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row) => (
                    <tr key={row.month} className="border-t border-violet-100">
                      <td className="px-4 py-3 font-medium text-[#1d1731]">{row.month}</td>
                      <td className="px-4 py-3 text-slate-600">{row.savings}</td>
                      <td className="px-4 py-3 text-slate-600">{row.loans}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{row.compliance}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1d1731]">Executive Summary</h2>
            <div className="mt-5 space-y-4">
              {[
                ['Savings growth', '+18.4%'],
                ['Loan approval rate', '92%'],
                ['Dividend payout ratio', '26%'],
                ['Member retention', '94%'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-violet-50 p-3">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="text-base font-bold text-[#1d1731]">{value}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
