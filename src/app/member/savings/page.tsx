'use client';

import Link from 'next/link';
import Image from 'next/image';

const summaryCards = [
  { label: 'Current Savings', value: '₦1,275,000', tone: 'bg-violet-50 text-[#6A11CB]' },
  { label: 'Weekly Deposit', value: '₦25,000', tone: 'bg-amber-50 text-amber-600' },
  { label: 'Shares Value', value: '₦420,000', tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Dividend Earned', value: '₦92,000', tone: 'bg-sky-50 text-sky-600' },
];

const transactionHistory = [
  { date: '19 Sep 2026', type: 'Savings Deposit', amount: '+₦25,000', status: 'Successful', note: 'Weekly contribution' },
  { date: '12 Sep 2026', type: 'Share Purchase', amount: '+₦10,000', status: 'Completed', note: 'One share unit added' },
  { date: '06 Sep 2026', type: 'Development Levy', amount: '-₦1,000', status: 'Processed', note: 'Cooperative levy' },
  { date: '02 Sep 2026', type: 'Dividend Payout', amount: '+₦18,000', status: 'Credited', note: 'Quarterly dividend' },
  { date: '28 Aug 2026', type: 'Loan Repayment', amount: '-₦35,000', status: 'Completed', note: 'Business loan instalment' },
  { date: '22 Aug 2026', type: 'Savings Deposit', amount: '+₦25,000', status: 'Successful', note: 'Weekly contribution' },
];

export default function SavingsPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white shadow-[0_18px_60px_rgba(76,29,149,0.22)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Portal</p>
            <h1 className="mt-2 text-3xl font-bold">Savings & Transactions</h1>
          </div>
          <Link href="/member" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</div>
              <div className="mt-4 text-3xl font-bold text-[#1d1731]">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1d1731]">Transaction History</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">Updated Today</span>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-violet-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50 text-[#4C1D95]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Note</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionHistory.map((item) => (
                    <tr key={`${item.date}-${item.type}`} className="border-t border-violet-100">
                      <td className="px-4 py-3 text-slate-600">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-[#1d1731]">{item.type}</td>
                      <td className="px-4 py-3 text-slate-600">{item.note}</td>
                      <td className="px-4 py-3 font-semibold text-[#1d1731]">{item.amount}</td>
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
            <h2 className="text-xl font-bold text-[#1d1731]">Savings Goal</h2>
            <div className="mt-5 rounded-[1.5rem] bg-violet-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Target Progress</span>
                <span className="font-bold text-[#6A11CB]">72%</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-violet-100">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#6A11CB] to-[#c4b5fd]" />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>Saved</span>
                <span className="font-bold text-[#1d1731]">₦1.27M</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                <span>Goal</span>
                <span className="font-bold text-[#1d1731]">₦1.75M</span>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-violet-200 bg-white p-4">
              <h3 className="text-base font-bold text-[#1d1731]">Quick Summary</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-center justify-between"><span>Monthly deposit</span><span className="font-semibold text-[#1d1731]">₦100,000</span></li>
                <li className="flex items-center justify-between"><span>Share count</span><span className="font-semibold text-[#1d1731]">12 units</span></li>
                <li className="flex items-center justify-between"><span>Dividend rate</span><span className="font-semibold text-[#1d1731]">8%</span></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
