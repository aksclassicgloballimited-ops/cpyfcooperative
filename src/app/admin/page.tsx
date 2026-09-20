'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type MemberRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  membership?: { id?: string; category?: string; grade?: string; membershipNo?: string; weeklyTarget?: number | null; status?: string; paymentSubmittedAt?: string | null } | null;
};

type LoanQueueItem = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  purpose: string;
  status: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null;
};

const quickActions = [
  { label: 'Review Applications', href: '#review-queue' },
  { label: 'Manage Members', href: '#review-queue' },
  { label: 'Loan Requests', href: '#review-queue' },
  { label: 'Reports', href: '/admin/reports' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loanQueue, setLoanQueue] = useState<LoanQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialMessage, setFinancialMessage] = useState('');

  const loadAdminData = async () => {
    try {
      const [membersResponse, loansResponse] = await Promise.all([
        fetch('/api/members', { cache: 'no-store' }),
        fetch('/api/loans?scope=all', { cache: 'no-store' }),
      ]);

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members ?? []);
      }

      if (loansResponse.ok) {
        const loansData = await loansResponse.json();
        setLoanQueue(loansData.loans ?? []);
      }
    } catch {
      // keep fallback data if backend is unavailable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/#portal');
          return;
        }

        const data = await response.json();
        if (!data.user || (data.user.role !== 'ADMIN' && data.user.role !== 'EXECUTIVE')) {
          router.replace('/member');
          return;
        }

        await loadAdminData();
      } catch {
        router.replace('/#portal');
      }
    };

    loadUser();
  }, [router]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/loans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        await loadAdminData();
      }
    } catch {
      // fail silently for now
    }
  };

  const handleMemberStatus = async (userId: string, status: 'ACTIVE' | 'REJECTED') => {
    const response = await fetch('/api/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    });
    if (response.ok) await loadAdminData();
  };

  const addSavings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: form.get('userId'), amount: Number(form.get('amount')), description: form.get('description') }) });
    const data = await response.json();
    setFinancialMessage(response.ok ? 'Savings transaction posted and added to the audit trail.' : data.error || 'Unable to post savings.');
    if (response.ok) event.currentTarget.reset();
  };

  const adjustShares = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membershipId: form.get('membershipId'), units: Number(form.get('units')), unitPrice: Number(form.get('unitPrice')), type: 'ADMIN_ADJUSTMENT', description: form.get('description') }) });
    const data = await response.json();
    setFinancialMessage(response.ok ? 'Share holding updated and adjustment recorded.' : data.error || 'Unable to update shares.');
    if (response.ok) event.currentTarget.reset();
  };

  const queue = loanQueue;

  const summaryCards = [
    { label: 'Total Members', value: String(members.length || 0), tone: 'bg-violet-50 text-[#6A11CB]' },
    { label: 'Pending Applications', value: String(queue.filter((item) => item.status === 'PENDING').length || 0), tone: 'bg-amber-50 text-amber-600' },
    { label: 'Active Loans', value: String(queue.filter((item) => item.status === 'APPROVED' || item.status === 'DISBURSED').length || 0), tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Monthly Savings', value: '₦7.8M', tone: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]"><Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative</a>
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-[#1d1234] p-6 text-white shadow-[0_18px_60px_rgba(29,18,52,0.22)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Admin Console</p>
            <h1 className="mt-2 text-3xl font-bold">CPYIF Executive Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/settings" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Category Settings</a>
            <button type="button" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.replace('/#portal'); }} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold">Logout</button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</div>
              <div className="mt-4 text-3xl font-bold text-[#1d1731]">{item.value}</div>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#1d1731]">Membership Applications</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{members.filter((member) => member.membership?.status === 'PENDING').length} pending</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Membership No.</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-violet-100">
                    <td className="px-4 py-3"><div className="font-semibold">{member.firstName} {member.lastName}</div><div className="text-xs text-slate-500">{member.email}</div></td>
                    <td className="px-4 py-3 font-semibold">{member.membership?.membershipNo || '—'}</td>
                    <td className="px-4 py-3">{member.membership?.paymentSubmittedAt ? 'Submitted' : 'Not submitted'}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold">{member.membership?.status || 'PENDING'}</span></td>
                    <td className="px-4 py-3">{member.membership?.status === 'PENDING' && <div className="flex gap-2"><button type="button" onClick={() => handleMemberStatus(member.id, 'ACTIVE')} className="rounded-full bg-[#6A11CB] px-3 py-1 text-xs font-bold text-white">Approve</button><button type="button" onClick={() => handleMemberStatus(member.id, 'REJECTED')} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">Reject</button></div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Financial Controls</h2>
              <p className="mt-1 text-sm text-slate-600">Every adjustment is recorded with the acting administrator and a timestamp.</p>
            </div>
            <a href="/api/savings?scope=all&format=csv" className="rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-[#6A11CB]">Export Savings CSV</a>
          </div>
          {financialMessage && <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-[#4C1D95]">{financialMessage}</p>}
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <form onSubmit={addSavings} className="rounded-2xl bg-violet-50 p-5">
              <h3 className="font-bold">Add Savings</h3>
              <div className="mt-4 grid gap-3">
                <select name="userId" required className="rounded-xl border border-violet-200 bg-white px-3 py-2"><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select>
                <input name="amount" required type="number" min="1" placeholder="Amount (₦)" className="rounded-xl border border-violet-200 px-3 py-2" />
                <input name="description" required placeholder="Description" className="rounded-xl border border-violet-200 px-3 py-2" />
                <button className="rounded-full bg-[#6A11CB] px-4 py-2 font-bold text-white">Post Savings</button>
              </div>
            </form>
            <form onSubmit={adjustShares} className="rounded-2xl bg-violet-50 p-5">
              <h3 className="font-bold">Add or Reduce Shares</h3>
              <div className="mt-4 grid gap-3">
                <select name="membershipId" required className="rounded-xl border border-violet-200 bg-white px-3 py-2"><option value="">Select member</option>{members.filter((member) => member.membership?.id).map((member) => <option key={member.membership?.id} value={member.membership?.id}>{member.firstName} {member.lastName}</option>)}</select>
                <input name="units" required type="number" placeholder="Units (use negative to reduce)" className="rounded-xl border border-violet-200 px-3 py-2" />
                <input name="unitPrice" required type="number" min="1" placeholder="Unit price (₦)" className="rounded-xl border border-violet-200 px-3 py-2" />
                <input name="description" required placeholder="Reason for adjustment" className="rounded-xl border border-violet-200 px-3 py-2" />
                <button className="rounded-full bg-[#6A11CB] px-4 py-2 font-bold text-white">Update Shares</button>
              </div>
            </form>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section id="review-queue" className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1d1731]">Application Review Queue</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">{loading ? 'Loading...' : 'Live'}</span>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-violet-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50 text-[#4C1D95]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Member</th>
                    <th className="px-4 py-3 font-bold">Purpose</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => {
                    const applicantName = item.user ? `${item.user.firstName ?? ''} ${item.user.lastName ?? ''}`.trim() : 'Pending member';
                    const statusClass = item.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-600'
                      : item.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-600'
                        : item.status === 'DISBURSED'
                          ? 'bg-sky-50 text-sky-600'
                          : 'bg-amber-50 text-amber-600';

                    return (
                      <tr key={item.id} className="border-t border-violet-100 align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#1d1731]">{applicantName}</div>
                          <div className="text-xs text-slate-500">{item.user?.email ?? 'Member'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.purpose}</td>
                        <td className="px-4 py-3 font-semibold text-[#1d1731]">₦{Number(item.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleReview(item.id, 'APPROVED')}
                              className="rounded-full bg-[#6A11CB] px-3 py-1 text-xs font-semibold text-white hover:bg-[#4C1D95]"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReview(item.id, 'REJECTED')}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1d1731]">Quick Actions</h2>
            <div className="mt-5 space-y-3">
              {quickActions.map((action) => (
                <a key={action.label} href={action.href} className="flex w-full items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-left text-sm font-semibold text-[#4C1D95] transition hover:bg-violet-100">
                  {action.label}
                  <span>→</span>
                </a>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#1d1731]">Performance Report</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Quarterly</span>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Savings Growth', value: '+18.4%', tone: 'bg-violet-50 text-[#6A11CB]' },
              { label: 'Loan Approval Rate', value: '92%', tone: 'bg-emerald-50 text-emerald-600' },
              { label: 'Dividend Payout', value: '₦2.1M', tone: 'bg-amber-50 text-amber-600' },
              { label: 'Member Retention', value: '94%', tone: 'bg-sky-50 text-sky-600' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.2rem] border border-violet-100 bg-violet-50/40 p-4">
                <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.tone}`}>{item.label}</div>
                <div className="mt-4 text-2xl font-bold text-[#1d1731]">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
