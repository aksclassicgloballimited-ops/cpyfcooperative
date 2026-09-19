'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type MemberRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  membership?: { category?: string; membershipNo?: string; weeklyTarget?: number | null } | null;
};

const quickActions = ['Review Applications', 'Manage Members', 'Loan Requests', 'Reports'];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRecord[]>([]);

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

        const membersResponse = await fetch('/api/members', { cache: 'no-store' });
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setMembers(membersData.members ?? []);
        }
      } catch {
        router.replace('/#portal');
      }
    };

    loadUser();
  }, [router]);

  const summaryCards = [
    { label: 'Total Members', value: String(members.length || 0), tone: 'bg-violet-50 text-[#6A11CB]' },
    { label: 'Pending Applications', value: '48', tone: 'bg-amber-50 text-amber-600' },
    { label: 'Active Loans', value: '163', tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Monthly Savings', value: '₦7.8M', tone: 'bg-sky-50 text-sky-600' },
  ];

  const appQueue = (members.length ? members.slice(0, 4) : [
    { id: 'demo-1', firstName: 'Faridat', lastName: 'Bello', email: 'faridat@cpyif.org', phone: '08000000000', role: 'MEMBER', membership: { category: 'Appearance', membershipNo: 'CPYF-1001', weeklyTarget: 2500 } },
    { id: 'demo-2', firstName: 'Musa', lastName: 'Adamu', email: 'musa@cpyif.org', phone: '08000000001', role: 'MEMBER', membership: { category: 'Non-Appearance', membershipNo: 'CPYF-1002', weeklyTarget: 3000 } },
    { id: 'demo-3', firstName: 'Grace', lastName: 'Kola', email: 'grace@cpyif.org', phone: '08000000002', role: 'MEMBER', membership: { category: 'Appearance', membershipNo: 'CPYF-1003', weeklyTarget: 2500 } },
    { id: 'demo-4', firstName: 'Kehinde', lastName: 'Ayo', email: 'kehinde@cpyif.org', phone: '08000000003', role: 'MEMBER', membership: { category: 'Non-Appearance', membershipNo: 'CPYF-1004', weeklyTarget: 3000 } },
  ]).map((item) => ({
    name: `${item.firstName} ${item.lastName}`,
    category: item.membership?.category ?? 'Appearance',
    amount: `₦${(item.membership?.weeklyTarget ?? 2500).toLocaleString()}`,
    status: item.role === 'ADMIN' ? 'Approved' : item.role === 'EXECUTIVE' ? 'Review' : 'Pending',
  }));

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-[#1d1234] p-6 text-white shadow-[0_18px_60px_rgba(29,18,52,0.22)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Admin Console</p>
            <h1 className="mt-2 text-3xl font-bold">CPYIF Executive Dashboard</h1>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            Executive Access</div>
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
              <h2 className="text-2xl font-bold text-[#1d1731]">Application Review Queue</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#6A11CB]">Live</span>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-violet-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-violet-50 text-[#4C1D95]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Member</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appQueue.map((item) => (
                    <tr key={item.name} className="border-t border-violet-100">
                      <td className="px-4 py-3 font-medium text-[#1d1731]">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.category}</td>
                      <td className="px-4 py-3 font-semibold text-[#1d1731]">{item.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Review' ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-[#6A11CB]'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1d1731]">Quick Actions</h2>
            <div className="mt-5 space-y-3">
              {quickActions.map((action) => (
                <button key={action} type="button" className="flex w-full items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-left text-sm font-semibold text-[#4C1D95] transition hover:bg-violet-100">
                  {action}
                  <span>→</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
