'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Loan = Record<string, any>;

const dateText = (value?: string | null) => (value ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const naira = (value?: number | null) => `N${Number(value || 0).toLocaleString()}`;

export default function LoanRecordPage() {
  const { id } = useParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/loans?scope=all&id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load loan record');
        setLoan(data.loan);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load loan record'));
  }, [id]);

  if (error) return <main className="p-10 text-center text-rose-600">{error}</main>;
  if (!loan) return <main className="p-10 text-center">Loading...</main>;

  const user = loan.user || {};
  const sections: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: 'Member',
      rows: [
        ['Name', `${user.firstName || ''} ${user.lastName || ''}`],
        ['Membership number', user.membership?.membershipNo || '-'],
        ['Grade', user.membership?.grade || '-'],
        ['Phone', user.phone || '-'],
        ['Email', user.email || '-'],
        ['Address', user.address || '-'],
      ],
    },
    {
      title: 'Loan Details',
      rows: [
        ['Application no.', loan.applicationNo],
        ['Loan type', String(loan.type).replace(/_/g, ' ')],
        ['Status', loan.status],
        ['Amount', naira(loan.amount)],
        ['Purpose', loan.purpose || '-'],
        ['Processing fee', naira(loan.processingFee)],
        ['Total repayment', naira(loan.totalRepayment)],
        ['Installment', naira(loan.estimatedInstallment)],
        ['Repayment period', loan.repaymentPeriod ? `${loan.repaymentPeriod} (${loan.repaymentFrequency || ''})` : '-'],
        ['Applied on', dateText(loan.createdAt)],
        ['Reviewed on', dateText(loan.reviewedAt)],
      ],
    },
    {
      title: 'Payout Account',
      rows: [
        ['Bank', loan.bankName || '-'],
        ['Account number', loan.accountNumber || '-'],
        ['Account name', loan.accountName || '-'],
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-3xl justify-between">
        <Link href="/admin/loans" className="text-sm font-bold text-[#4C1D95]">&larr; Back to loans</Link>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-[#6A11CB] px-5 py-2 text-sm font-bold text-white">Download PDF / Print</button>
      </div>
      <article className="mx-auto max-w-3xl bg-white p-8 shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b-2 border-[#6A11CB] pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cpyf-logo.jpeg" alt="CPYIF logo" className="h-20 w-20 rounded-full object-cover" />
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-[#4C1D95]">Circle of Prosperous Youth Interest-Free Cooperative</h1>
            <p className="text-sm text-slate-600">RC No. 7379803 · Loan Record</p>
          </div>
          {user.passportPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.passportPhoto} alt="Passport" className="h-28 w-24 rounded border border-slate-300 object-cover" />
          )}
        </header>

        {sections.map((section) => (
          <section key={section.title} className="mt-5 break-inside-avoid">
            <h2 className="bg-violet-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-[#4C1D95]">{section.title}</h2>
            <dl className="grid grid-cols-2 gap-x-6 text-sm">
              {section.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-200 py-1.5">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section className="mt-5 break-inside-avoid text-sm">
          <h2 className="bg-violet-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-[#4C1D95]">Guarantors</h2>
          {[1, 2].map((n) => {
            const key = n === 1 ? 'guarantor' : 'guarantor2';
            if (!loan[`${key}Name`]) return null;
            const request = (loan.guarantorRequests || []).find((item: Loan) => item.guarantorMembershipNo === loan[`${key}MembershipNo`]);
            return (
              <div key={n} className="flex justify-between gap-3 border-b border-slate-200 py-1.5">
                <span>{loan[`${key}Name`]} ({loan[`${key}MembershipNo`] || '-'}) · {loan[`${key}Phone`] || '-'}</span>
                <b>{request?.status || 'NO REQUEST'}</b>
              </div>
            );
          })}
        </section>

        <section className="mt-5 break-inside-avoid text-sm">
          <h2 className="bg-violet-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-[#4C1D95]">Status History</h2>
          {(loan.statusHistory || []).map((item: Loan) => (
            <div key={item.id} className="border-b border-slate-200 py-1.5">
              <b>{item.toStatus}</b> · {dateText(item.createdAt)}{item.reason ? ` · ${item.reason}` : ''}
            </div>
          ))}
        </section>

        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs text-slate-500">
          <div className="border-t border-slate-400 pt-1">Member signature</div>
          <div className="border-t border-slate-400 pt-1">Financial Officer</div>
          <div className="border-t border-slate-400 pt-1">Super Administrator</div>
        </div>
      </article>
    </main>
  );
}
