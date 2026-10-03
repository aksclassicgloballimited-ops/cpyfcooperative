'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { can } from '@/lib/permissions';

type Levy = {
  id: string;
  membershipNo: string;
  category: 'APPEARANCE' | 'NON_APPEARANCE';
  amount: number;
  weekStart: string;
  sourceSavingsAmount: number;
  createdAt: string;
  user: { firstName: string; lastName: string };
};

type Summary = { allTime: number; thisMonth: number; appearanceTotal: number; nonAppearanceTotal: number };

const naira = (value: number) => `₦${Number(value || 0).toLocaleString()}`;
const day = (value: string) => new Date(value).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

export default function DevelopmentLevyPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [levies, setLevies] = useState<Levy[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [week, setWeek] = useState('');
  const [member, setMember] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const me = await fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
      if (!me?.user || !can(me.user.role, 'developmentLevy')) {
        router.replace(me?.user && me.user.role !== 'MEMBER' ? '/admin' : '/#portal');
        return;
      }
      setAllowed(true);
      const response = await fetch('/api/admin/development-levy', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to load development levy records');
        return;
      }
      setLevies(data.levies ?? []);
      setSummary(data.summary);
    };
    load();
  }, [router]);

  const weeks = useMemo(() => Array.from(new Set(levies.map((l) => l.weekStart))).sort().reverse(), [levies]);
  const members = useMemo(() => {
    const map = new Map<string, string>();
    levies.forEach((l) => map.set(l.membershipNo, `${l.user.firstName} ${l.user.lastName}`));
    return Array.from(map.entries());
  }, [levies]);

  const filtered = levies.filter((l) => {
    if (type && l.category !== type) return false;
    if (week && l.weekStart !== week) return false;
    if (member && l.membershipNo !== member) return false;
    const term = search.trim().toLowerCase();
    if (term && !`${l.user.firstName} ${l.user.lastName} ${l.membershipNo}`.toLowerCase().includes(term)) return false;
    return true;
  });

  const exportCsv = () => {
    const rows = [
      ['Date', 'Membership No', 'Full Name', 'Type', 'Amount Deducted', 'Week (Wed)', 'Source Savings Amount'],
      ...filtered.map((l) => [new Date(l.createdAt).toISOString(), l.membershipNo, `${l.user.firstName} ${l.user.lastName}`, l.category === 'APPEARANCE' ? 'Appearance' : 'Non-Appearance', l.amount, l.weekStart.slice(0, 10), l.sourceSavingsAmount]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'development-levy.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!allowed) return <main className="flex min-h-screen items-center justify-center bg-[#f8f5ff]">{error || 'Loading...'}</main>;

  const cards = [
    { label: 'Total Collected (All Time)', value: summary?.allTime },
    { label: 'Total This Month', value: summary?.thisMonth },
    { label: 'Appearance (₦500s)', value: summary?.appearanceTotal },
    { label: 'Non-Appearance (₦1,000s)', value: summary?.nonAppearanceTotal },
  ];
  const input = 'rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm';

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="font-bold text-[#6A11CB]">← Back to admin</Link>
        <div className="mt-5 rounded-[2rem] bg-[#1d1234] p-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Finance</p>
          <h1 className="mt-2 text-3xl font-bold">Development Levy</h1>
          <p className="mt-2 text-violet-100">Deducted automatically once per member per payment week (Wednesday – Tuesday).</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6A11CB]">{card.label}</p>
              <p className="mt-3 text-3xl font-bold">{summary ? naira(card.value ?? 0) : '…'}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or membership no" className={`${input} min-w-[240px] flex-1`} />
            <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
              <option value="">All types</option>
              <option value="APPEARANCE">Appearance</option>
              <option value="NON_APPEARANCE">Non-Appearance</option>
            </select>
            <select value={week} onChange={(e) => setWeek(e.target.value)} className={input}>
              <option value="">All weeks</option>
              {weeks.map((w) => <option key={w} value={w}>Week of {day(w)}</option>)}
            </select>
            <select value={member} onChange={(e) => setMember(e.target.value)} className={input}>
              <option value="">All members</option>
              {members.map(([no, name]) => <option key={no} value={no}>{name} ({no})</option>)}
            </select>
            <button type="button" onClick={exportCsv} className="rounded-full bg-[#6A11CB] px-5 py-2 text-sm font-bold text-white">Export CSV</button>
          </div>
          {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}

          <div className="mt-5 overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-violet-50 text-[#4C1D95]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Membership No</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount Deducted</th>
                  <th className="px-4 py-3">Week (Wed)</th>
                  <th className="px-4 py-3">Source Savings Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-violet-100">
                    <td className="px-4 py-3">{day(l.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold">{l.membershipNo}</td>
                    <td className="px-4 py-3">{l.user.firstName} {l.user.lastName}</td>
                    <td className="px-4 py-3">{l.category === 'APPEARANCE' ? 'Appearance' : 'Non-Appearance'}</td>
                    <td className="px-4 py-3 font-bold">{naira(l.amount)}</td>
                    <td className="px-4 py-3">{day(l.weekStart)}</td>
                    <td className="px-4 py-3">{naira(l.sourceSavingsAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="p-8 text-center text-sm text-slate-500">No development levy records found.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
