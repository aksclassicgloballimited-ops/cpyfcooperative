'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import IdCardViewer from '@/components/IdCardViewer';

type CardData = { fullName: string; membershipNo: string; address: string; phone: string; nomineePhone: string; passportPhoto: string; status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED'; approvalDate: string; issueDate: string; expiryDate: string; lastRenewalDate: string | null; verifyToken: string };
type Payment = { id: string; kind: string; amount: number; reference: string; transactionNo?: string | null; status: string; rejectionReason?: string | null; createdAt: string };
type Overview = { fee: number; membershipStatus: string; membershipNo: string | null; missing: string[]; canRequest: 'ISSUE' | 'RENEWAL' | null; blockedReason: string | null; cardStatus: string | null; card: CardData | null; payments: Payment[]; history: Array<{ action: string; reference?: string | null; issueDate?: string | null; expiryDate?: string | null; createdAt: string }> };

const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

export default function IdCardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transactionNo, setTransactionNo] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/idcard', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) { setError(body.error || 'Unable to load ID card'); return; }
    setData(body);
  }, []);
  useEffect(() => { load().catch(() => setError('Unable to load ID card')); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const form = new FormData();
      form.set('transactionNo', transactionNo);
      if (receipt) form.set('receipt', receipt);
      const response = await fetch('/api/idcard/payment', { method: 'POST', body: form });
      const body = await response.json();
      setMessage(response.ok ? `Payment submitted (ref ${body.payment.reference}). Your card will be issued once the finance team verifies it.` : body.error || 'Payment submission failed');
      if (response.ok) { setOpen(false); setTransactionNo(''); setReceipt(null); }
      await load();
    } finally { setBusy(false); }
  };

  const pending = data?.payments.find((payment) => payment.status === 'PENDING');
  const latest = data?.payments[0];
  const usable = data?.card && (data.card.status === 'ACTIVE' || data.card.status === 'EXPIRED');

  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</Link>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Portal</p><h1 className="mt-2 text-3xl font-bold">Membership ID Card</h1></div>
          <Link href="/member" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Back to Dashboard</Link>
        </div>
        {error && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p className="mb-5 rounded-xl bg-violet-100 px-4 py-3 text-sm font-semibold text-[#4C1D95]">{message}</p>}
        {data && <>
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[['Application status', data.membershipStatus === 'ACTIVE' ? 'Approved' : data.membershipStatus], ['Membership ID', data.membershipNo || '—'], ['ID card status', data.cardStatus ?? 'Not generated'], ['Payment status', pending ? 'Pending verification' : latest ? (latest.status === 'APPROVED' ? 'Verified' : latest.status === 'REJECTED' ? 'Rejected' : latest.status) : 'No payment'], ['Issue date', date(data.card?.issueDate)], ['Expiry date', date(data.card?.expiryDate)], ['Membership approved', date(data.card?.approvalDate)], ['Transaction reference', latest?.reference || '—']].map(([label, value]) => <div key={label} className="rounded-xl bg-violet-50 p-3"><p className="text-xs font-bold uppercase text-[#6A11CB]">{label}</p><p className="mt-1 break-all font-bold">{value}</p></div>)}
            </div>

            {data.cardStatus === 'EXPIRED' && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">ID Card Expired — Renew for ₦{data.fee.toLocaleString()}</p>}
            {(data.cardStatus === 'SUSPENDED' || data.cardStatus === 'REVOKED') && <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Your ID card is {data.cardStatus.toLowerCase()}. Contact the cooperative office for assistance.</p>}
            {data.missing.length > 0 && data.membershipStatus === 'ACTIVE' && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Your profile is missing: {data.missing.join(', ')}. Update your profile or ask an administrator for help before generating your card.</p>}
            {pending && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Payment {pending.reference} is awaiting verification by the finance team. No card is issued until it is verified.</p>}
            {latest?.status === 'REJECTED' && !pending && <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Your last payment ({latest.reference}) was rejected. {latest.rejectionReason}</p>}

            {data.canRequest && !open && <button type="button" onClick={() => setOpen(true)} className="mt-5 rounded-full bg-[#6A11CB] px-6 py-3 font-bold text-white">{data.canRequest === 'RENEWAL' ? 'Renew ID Card' : 'Generate Membership ID Card'} — ₦{data.fee.toLocaleString()}</button>}
            {data.canRequest && open && (
              <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl border border-violet-200 p-5">
                <p className="text-lg font-bold">ID card fee: ₦{data.fee.toLocaleString()}</p>
                <div className="rounded-2xl bg-violet-50 p-4 text-sm"><p className="font-bold text-[#4C1D95]">Cooperative payment account</p><p className="mt-2">Bank: UBA</p><p>Account number: 2331842430</p><p>Account name: Circle of Prosperous Youth Forum</p></div>
                <p className="text-sm text-slate-600">Transfer exactly ₦{data.fee.toLocaleString()}, then submit your bank transaction number or receipt. Your card is generated only after the finance team verifies the payment.</p>
                <label className="grid gap-2 text-sm font-semibold">Bank transaction number<input value={transactionNo} maxLength={64} onChange={(event) => setTransactionNo(event.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
                <label className="grid gap-2 text-sm font-semibold">Payment receipt (max 150 KB)<input type="file" accept="image/*,.pdf" onChange={(event) => setReceipt(event.target.files?.[0] || null)} className="rounded-xl border border-violet-200 px-3 py-2 text-sm" /></label>
                <div className="flex gap-3"><button disabled={busy} className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? 'Submitting...' : 'Submit Payment for Verification'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-violet-300 px-5 py-3 font-bold text-[#4C1D95]">Cancel</button></div>
              </form>
            )}
            {!data.canRequest && !data.card && data.blockedReason && !pending && <p className="mt-5 text-sm font-semibold text-slate-600">{data.blockedReason}</p>}
          </section>

          {data.card && usable && <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">Your ID Card</h2>
            <IdCardViewer card={data.card} filename={`CPYF-ID-${data.card.membershipNo.replace(/[^A-Za-z0-9-]/g, '')}`} />
          </section>}

          {(data.history.length > 0 || data.payments.length > 0) && <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Payments & Renewal History</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-violet-50"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{data.payments.map((payment) => <tr key={payment.id} className="border-t border-violet-100"><td className="px-4 py-3">{date(payment.createdAt)}</td><td className="px-4 py-3">{payment.kind === 'RENEWAL' ? 'Renewal' : 'New card'}</td><td className="px-4 py-3">{payment.reference}</td><td className="px-4 py-3 font-bold">₦{payment.amount.toLocaleString()}</td><td className="px-4 py-3">{payment.status}</td></tr>)}</tbody></table></div>
            {data.history.length > 0 && <ul className="mt-4 grid gap-2 text-sm">{data.history.map((item, index) => <li key={index} className="rounded-xl bg-violet-50 px-4 py-2"><b>{item.action === 'RENEWED' ? 'Renewed' : 'Issued'}</b> on {date(item.createdAt)} · valid {date(item.issueDate)} – {date(item.expiryDate)}{item.reference ? ` · ${item.reference}` : ''}</li>)}</ul>}
          </section>}
        </>}
      </div>
    </main>
  );
}
