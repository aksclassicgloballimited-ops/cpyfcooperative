'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const notifications = [
  'Weekly meeting scheduled for Wednesday at 7:00 PM.',
  'Quarterly dividend distribution is pending review.',
  'Your loan repayment reminder is due in 3 days.',
];

const quickActions = [
  { label: 'Add Savings', href: '/member/savings' },
  { label: 'Apply for Loan', href: '#loan-form' },
  { label: 'Track Shares', href: '/member/shares' },
  { label: 'Download Statement', href: '/member/savings' },
];

export default function MemberDashboardPage() {
  const router = useRouter();
  const [memberTitle, setMemberTitle] = useState('Welcome back, Ada Musa');
  const [membershipNo, setMembershipNo] = useState('CPYF-1789822284234');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [weeklyTarget, setWeeklyTarget] = useState(2500);
  const [grade, setGrade] = useState('ACTIVE');
  const [loanApplications, setLoanApplications] = useState<Array<{ type: string; amount: number; purpose: string; status: string; createdAt: string }>>([]);
  const [loanForm, setLoanForm] = useState({ type: 'BUSINESS', amount: '250000', purpose: 'Business expansion and working capital' });
  const [loanMessage, setLoanMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profile, setProfile] = useState({
    firstName: 'Ada',
    lastName: 'Musa',
    email: '',
    phone: '+2348000000002',
    weeklyTarget: '2500',
    membershipType: 'Appearance Member',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/#portal');
          return;
        }

        const data = await response.json();
        if (data.user?.role === 'ADMIN' || data.user?.role === 'EXECUTIVE') {
          router.replace('/admin');
          return;
        }

        if (data.user?.firstName) {
          const fullName = `${data.user.firstName} ${data.user.lastName || ''}`.trim();
          setMemberTitle(`Welcome back, ${fullName}`);
          setMembershipNo(data.user.membership?.membershipNo || membershipNo);
          setWeeklyTarget(Number(data.user.membership?.weeklyTarget || weeklyTarget));
          setGrade(data.user.membership?.grade || 'ACTIVE');
          setMemberRole(data.user.role || 'MEMBER');
          setProfile((current) => ({
            ...current,
            firstName: data.user.firstName || current.firstName,
            lastName: data.user.lastName || current.lastName,
            email: data.user.email || current.email,
            phone: data.user.phone || current.phone,
            weeklyTarget: String(data.user.membership?.weeklyTarget ?? current.weeklyTarget),
            membershipType: data.user.membership?.category === 'NON_APPEARANCE' ? 'Non-Appearance Member' : 'Appearance Member',
          }));
        }
      } catch {
        router.replace('/#portal');
      }
    };

    const loadLoans = async () => {
      try {
        const response = await fetch('/api/loans', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.loans)) {
          setLoanApplications(data.loans);
        }
      } catch {
        // quiet fail
      }
    };

    loadUser();
    loadLoans();
  }, [router]);

  const totalSavings = weeklyTarget * 12 * 2;
  const activeLoanTotal = loanApplications.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dividendAmount = Math.round(totalSavings * 0.08);
  const shareUnits = Math.max(4, Math.round(totalSavings / 50000));
  const loanCapacity = Math.min(3, Math.max(1, Math.round((weeklyTarget / 2500) + 1)));

  const summaryCards = [
    { label: 'Total Savings', value: `₦${totalSavings.toLocaleString()}`, tone: 'bg-violet-50 text-[#6A11CB]' },
    { label: 'Active Loan', value: `₦${activeLoanTotal.toLocaleString()}`, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Dividend', value: `₦${dividendAmount.toLocaleString()}`, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Membership Grade', value: grade, tone: 'bg-sky-50 text-sky-600' },
  ];

  const shareProgress = [
    { label: 'Share Units', value: `${shareUnits} Units`, tone: 'bg-violet-50 text-[#6A11CB]' },
    { label: 'Weekly Target', value: `₦${weeklyTarget.toLocaleString()}`, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Loan Capacity', value: `${loanCapacity}x Savings`, tone: 'bg-emerald-50 text-emerald-600' },
  ];

  const recentTransactions = loanApplications.length > 0 ? loanApplications.slice(0, 4).map((loan) => ({
    type: loan.type,
    amount: `₦${Number(loan.amount || 0).toLocaleString()}`,
    date: new Date(loan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: loan.status || 'PENDING',
  })) : [
    { type: 'Savings', amount: '+₦25,000', date: 'Today', status: 'Completed' },
    { type: 'Development Levy', amount: '-₦1,000', date: 'Mon 09 Sep', status: 'Processed' },
    { type: 'Share Purchase', amount: '+₦10,000', date: 'Sun 08 Sep', status: 'Completed' },
    { type: 'Loan Disbursement', amount: '+₦250,000', date: 'Fri 06 Sep', status: 'Paid' },
  ];

  const handleLoanSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoanMessage('Submitting loan application...');

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: loanForm.type,
          amount: Number(loanForm.amount),
          purpose: loanForm.purpose,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Loan submission failed');
      }

      setLoanMessage('Loan application submitted successfully.');
      setLoanForm({ type: 'BUSINESS', amount: '250000', purpose: 'Business expansion and working capital' });
      const refreshed = await fetch('/api/loans', { cache: 'no-store' });
      const refreshedData = await refreshed.json();
      if (Array.isArray(refreshedData.loans)) setLoanApplications(refreshedData.loans);
    } catch (error) {
      setLoanMessage(error instanceof Error ? error.message : 'Loan submission failed');
    }
  };

  const handleProfileSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage('Profile information saved successfully.');
    setWeeklyTarget(Number(profile.weeklyTarget || 2500));
  };

  return (
    <main className="min-h-screen bg-[#f5f3ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-6 text-white shadow-[0_18px_60px_rgba(76,29,149,0.22)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Member Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold">{memberTitle}</h1>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
            Membership No: {membershipNo}
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

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {shareProgress.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</div>
              <div className="mt-4 text-2xl font-bold text-[#1d1731]">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1d1731]">Savings Overview</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">This Month</span>
            </div>

            <div className="grid h-52 grid-cols-12 items-end gap-3">
              {[42, 58, 46, 72, 60, 88, 76, 92, 85, 70, 96, 100].map((height, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-[1rem] bg-gradient-to-t from-[#6A11CB] to-[#c4b5fd]" style={{ height: `${height}%` }} />
                  <span className="text-[10px] font-semibold uppercase text-slate-400">{['J','F','M','A','M','J','J','A','S','O','N','D'][index]}</span>
                </div>
              ))}
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

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1d1731]">Recent Transactions</h2>
              <a href="#" className="text-sm font-semibold text-[#6A11CB]">View All</a>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-violet-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50 text-[#4C1D95]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((item) => (
                    <tr key={`${item.type}-${item.date}`} className="border-t border-violet-100">
                      <td className="px-4 py-3 font-medium text-[#1d1731]">{item.type}</td>
                      <td className="px-4 py-3 text-slate-600">{item.date}</td>
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

          <aside id="loan-form" className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1d1731]">Apply for Loan</h2>
            <form onSubmit={handleLoanSubmit} className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Loan type
                <select value={loanForm.type} onChange={(event) => setLoanForm((current) => ({ ...current, type: event.target.value }))} className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]">
                  <option value="BUSINESS">Business</option>
                  <option value="PROPERTY">Property</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Amount (₦)
                <input type="number" value={loanForm.amount} onChange={(event) => setLoanForm((current) => ({ ...current, amount: event.target.value }))} className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]" min="10000" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Purpose
                <textarea value={loanForm.purpose} onChange={(event) => setLoanForm((current) => ({ ...current, purpose: event.target.value }))} className="min-h-[100px] rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]" />
              </label>

              {loanMessage && <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-[#4C1D95]">{loanMessage}</div>}

              <button type="submit" className="w-full rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white transition hover:bg-[#5b0fc4]">
                Submit Loan Request
              </button>
            </form>
          </aside>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1d1731]">Profile & Settings</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">{memberRole}</span>
            </div>

            <form onSubmit={handleProfileSave} className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                First Name
                <input
                  value={profile.firstName}
                  onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Last Name
                <input
                  value={profile.lastName}
                  onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Email Address
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Phone Number
                <input
                  value={profile.phone}
                  onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Membership Type
                <select
                  value={profile.membershipType}
                  onChange={(event) => setProfile((current) => ({ ...current, membershipType: event.target.value }))}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
                >
                  <option>Appearance Member</option>
                  <option>Non-Appearance Member</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Weekly Savings Target (₦)
                <input
                  type="number"
                  value={profile.weeklyTarget}
                  onChange={(event) => setProfile((current) => ({ ...current, weeklyTarget: event.target.value }))}
                  className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6A11CB]"
                />
              </label>

              {profileMessage && <div className="md:col-span-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-[#4C1D95]">{profileMessage}</div>}

              <div className="md:col-span-2">
                <button type="submit" className="rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white transition hover:bg-[#5b0fc4]">
                  Save Changes
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1d1731]">Notifications</h2>
            <div className="mt-5 space-y-4">
              {notifications.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl bg-violet-50 p-3 text-sm text-slate-700">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#6A11CB]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
