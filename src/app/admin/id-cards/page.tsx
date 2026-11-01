'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import IdCardViewer from '@/components/IdCardViewer';

type Row = { userId: string; name: string; membershipNo: string | null; missing: string[]; cardStatus: string | null; issueDate: string | null; expiryDate: string | null; renewalCount: number; latestPayment: { status: string; kind: string; reference: string } | null };
type Pending = { id: string; kind: string; amount: number; reference: string; transactionNo?: string | null; receipt?: string | null; createdAt: string; user: { firstName: string; lastName: string; membership?: { membershipNo: string | null } | null } };
type Detail = { card: { fullName: string; membershipNo: string; address: string; phone: string; nomineePhone: string; passportPhoto: string; status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED'; approvalDate: string; issueDate: string; expiryDate: string; lastRenewalDate: string | null; verifyToken: string } | null; renewalCount: number; statusReason: string | null; events: Array<{ id: string; action: string; actorRole?: string | null; reason?: string | null; reference?: string | null; createdAt: string }>; payments: Array<{ id: string; kind: string; amount: number; reference: string; transactionNo?: string | null; status: string; reviewedByRole?: string | null; createdAt: string }> };

const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

export default function AdminIdCardsPage() {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async (query = '') => {
    const response = await fetch(`/api/admin/idcards?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || 'Unable to load ID cards'); return; }
    setRows(data.members); setPending(data.pending);
  }, []);
  const open = async (row: Row) => {
    setSelected(row); setDetail(null);
    const response = await fetch(`/api/admin/idcards?userId=${row.userId}`, { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setDetail(data); else setMessage(data.error || 'Unable to load card');
  };
  useEffect(() => {
    load().catch(() => setMessage('Unable to load ID cards'));
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setRole(d.user?.role || '')).catch(() => undefined);
  }, [load]);

  const review = async (payment: Pending, status: 'APPROVED' | 'REJECTED') => {
    if (busyId) return;
    let reason = '';
    if (status === 'REJECTED') { reason = window.prompt('Reason for rejecting this payment') || ''; if (reason.trim().length < 3) return; }
    else if (!window.confirm(`Confirm that ₦${payment.amount.toLocaleString()} (${payment.reference}) was received?`)) return;
    setBusyId(payment.id);
    const response = await fetch('/api/admin/idcards/payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: payment.id, status, reason }) });
    const data = await response.json();
    setMessage(data.message || data.error || 'Done');
    setBusyId('');
    await load(q);
    if (selected) await open(selected);
  };

  const changeStatus = async (action: 'SUSPEND' | 'REVOKE' | 'REINSTATE') => {
    if (!selected) return;
    const reason = window.prompt(`Reason to ${action.toLowerCase()} this ID card`) || '';
    if (reason.trim().length < 3) return;
    const response = await fetch('/api/admin/idcards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selected.userId, action, reason }) });
    const data = await response.json();
    setMessage(response.ok ? `Card is now ${data.status.toLowerCase()}` : data.error || 'Action failed');
    await load(q); await open(selected);
  };

  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-gradient-to-r from-[#4C1D95] to-[#6A11CB] p-6 text-white">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Administration</p><h1 className="mt-2 text-3xl font-bold">ID Card Management</h1></div>
          <Link href="/admin" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Back to Dashboard</Link>
        </div>
        {message && <p className="mb-5 rounded-xl bg-violet-100 px-4 py-3 text-sm font-semibold text-[#4C1D95]">{message}</p>}

        <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">ID Card Payments Awaiting Verification ({pending.length})</h2>
          {pending.length === 0 ? <p className="mt-3 text-sm text-slate-500">No pending ID card payments.</p> : <div className="mt-4 overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-violet-50"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Proof</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{pending.map((payment) => <tr key={payment.id} className="border-t border-violet-100"><td className="px-4 py-3">{payment.user.firstName} {payment.user.lastName}<br /><span className="text-xs text-slate-500">{payment.user.membership?.membershipNo}</span></td><td className="px-4 py-3">{payment.kind === 'RENEWAL' ? 'Renewal' : 'New card'}</td><td className="px-4 py-3 font-bold">₦{payment.amount.toLocaleString()}</td><td className="px-4 py-3 text-xs">{payment.reference}</td><td className="px-4 py-3">{payment.transactionNo || ''} {payment.receipt && <a href={payment.receipt} download={`${payment.reference}`} className="font-semibold text-[#6A11CB] underline">Receipt</a>}</td><td className="px-4 py-3"><div className="flex gap-2"><button disabled={Boolean(busyId)} onClick={() => review(payment, 'APPROVED')} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Verify payment</button><button disabled={Boolean(busyId)} onClick={() => review(payment, 'REJECTED')} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Reject</button></div></td></tr>)}</tbody></table></div>}
        </section>

        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Members & Card Status</h2>
            <form onSubmit={(event) => { event.preventDefault(); load(q); }} className="flex gap-2"><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search name or Membership ID" className="rounded-xl border border-violet-200 px-3 py-2 text-sm" /><button className="rounded-full bg-[#6A11CB] px-4 py-2 text-sm font-bold text-white">Search</button></form></div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-violet-50"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Membership ID</th><th className="px-4 py-3">Card</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Data</th><th className="px-4 py-3"></th></tr></thead><tbody>{rows.map((row) => <tr key={row.userId} className="border-t border-violet-100"><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3">{row.membershipNo}</td><td className="px-4 py-3">{row.cardStatus ?? 'Not generated'}</td><td className="px-4 py-3">{date(row.issueDate)}</td><td className="px-4 py-3">{date(row.expiryDate)}</td><td className="px-4 py-3">{row.latestPayment?.status ?? '—'}</td><td className="px-4 py-3 text-xs text-amber-700">{row.missing.length ? `Missing: ${row.missing.join(', ')}` : 'Complete'}</td><td className="px-4 py-3"><button onClick={() => open(row)} className="rounded-full border border-[#6A11CB] px-3 py-1.5 text-xs font-bold text-[#6A11CB]">Open</button></td></tr>)}</tbody></table>{!rows.length && <p className="p-6 text-center text-sm text-slate-500">No approved members found.</p>}</div>
        </section>

        {selected && <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{selected.name} — {selected.membershipNo}</h2>
            {role === 'SUPER_ADMIN' && detail?.card && <div className="flex gap-2">
              {detail.card.status === 'ACTIVE' && <button onClick={() => changeStatus('SUSPEND')} className="rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white">Suspend</button>}
              {detail.card.status !== 'REVOKED' && <button onClick={() => changeStatus('REVOKE')} className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white">Revoke</button>}
              {(detail.card.status === 'SUSPENDED' || detail.card.status === 'REVOKED') && <button onClick={() => changeStatus('REINSTATE')} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Reinstate</button>}
            </div>}
          </div>
          {!detail ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : <>
            {detail.statusReason && <p className="mt-3 text-sm text-slate-600">Last status reason: {detail.statusReason}</p>}
            {detail.card ? <div className="mt-4"><p className="mb-3 text-sm text-slate-600">Approved {date(detail.card.approvalDate)} · Renewals: {detail.renewalCount}{detail.card.lastRenewalDate ? ` · Last renewed ${date(detail.card.lastRenewalDate)}` : ''}</p><IdCardViewer card={detail.card} filename={`CPYF-ID-${detail.card.membershipNo.replace(/[^A-Za-z0-9-]/g, '')}`} /></div> : <p className="mt-4 text-sm text-slate-500">No card has been issued to this member yet.</p>}
            <h3 className="mt-6 font-bold">Payments</h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-violet-100"><table className="w-full min-w-[620px] text-left text-sm"><tbody>{detail.payments.map((payment) => <tr key={payment.id} className="border-t border-violet-100 first:border-0"><td className="px-4 py-2">{date(payment.createdAt)}</td><td className="px-4 py-2">{payment.kind}</td><td className="px-4 py-2 text-xs">{payment.reference}</td><td className="px-4 py-2 font-bold">₦{payment.amount.toLocaleString()}</td><td className="px-4 py-2">{payment.status}{payment.reviewedByRole ? ` by ${payment.reviewedByRole}` : ''}</td></tr>)}{!detail.payments.length && <tr><td className="px-4 py-3 text-slate-500">No payments.</td></tr>}</tbody></table></div>
            <h3 className="mt-6 font-bold">Audit trail</h3>
            <ul className="mt-2 grid gap-2 text-sm">{detail.events.map((event) => <li key={event.id} className="rounded-xl bg-violet-50 px-4 py-2"><b>{event.action.replace(/_/g, ' ')}</b> · {new Date(event.createdAt).toLocaleString('en-GB')}{event.actorRole ? ` · ${event.actorRole}` : ''}{event.reference ? ` · ${event.reference}` : ''}{event.reason ? ` · ${event.reason}` : ''}</li>)}{!detail.events.length && <li className="text-slate-500">No events yet.</li>}</ul>
          </>}
        </section>}
      </div>
    </main>
  );
}
