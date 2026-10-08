'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type LoanMember = {
  id: string;
  name: string;
  email: string;
  membershipNo: string | null;
  grade: string;
  totalSavings: number;
  membershipMonths: number;
  qualified: boolean;
  loanAccess: 'AUTO' | 'DEACTIVATED' | 'OVERRIDE';
  loanAccessReason: string | null;
};

const accessLabel = { AUTO: 'Standard rules', DEACTIVATED: 'Deactivated', OVERRIDE: 'Activated (override)' } as const;
const accessTone = { AUTO: 'bg-slate-100 text-slate-700', DEACTIVATED: 'bg-rose-100 text-rose-700', OVERRIDE: 'bg-emerald-100 text-emerald-700' } as const;

export default function LoanAccessPage() {
  const [members, setMembers] = useState<LoanMember[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/loan-access?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || 'Unable to load members'); return; }
    setMembers(data.members ?? []);
  }, [search]);

  useEffect(() => {
    load().catch(() => setMessage('Unable to load members'));
    fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()).then((data) => setRole(data.user?.role || '')).catch(() => undefined);
    // Initial load only; searching is triggered by the Search button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (member: LoanMember, action: 'ACTIVATE' | 'DEACTIVATE' | 'OVERRIDE') => {
    const verb = action === 'DEACTIVATE' ? 'deactivating' : action === 'OVERRIDE' ? 'activating (override eligibility for)' : 'activating';
    const reason = window.prompt(`Reason for ${verb} loans for ${member.name}`);
    if (!reason || !reason.trim()) return;
    const response = await fetch('/api/loan-access', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: member.id, action, reason: reason.trim() }) });
    const data = await response.json();
    setMessage(response.ok ? data.message : data.error || 'Action failed');
    if (response.ok) load();
  };

  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="font-bold text-[#6A11CB]">← Back to admin</Link>
        <div className="mt-5 rounded-[2rem] bg-[#1d1234] p-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Loan Access</p>
          <h1 className="mt-2 text-3xl font-bold">Activate / Deactivate Member Loans</h1>
          <p className="mt-2 text-violet-100">Every action requires a reason and is recorded in the audit log.{isSuperAdmin ? ' As Super Administrator you can also activate loans for members who do not qualify.' : ''}</p>
        </div>
        <section className="mt-6 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or membership number" className="min-w-[280px] flex-1 rounded-xl border border-violet-200 px-3 py-2" />
            <button type="button" onClick={() => load()} className="rounded-full bg-[#6A11CB] px-5 py-2 font-bold text-white">Search</button>
          </div>
          {message && <p className="mt-4 text-sm font-semibold text-[#4C1D95]">{message}</p>}
          <div className="mt-5 overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-violet-50 text-[#4C1D95]"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Savings</th><th className="px-4 py-3">Eligibility</th><th className="px-4 py-3">Loan access</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-violet-100">
                    <td className="px-4 py-3"><b>{member.name}</b><span className="block text-xs text-slate-500">{member.membershipNo || 'No number'} · {member.email}</span></td>
                    <td className="px-4 py-3">{member.grade}<span className="block text-xs text-slate-500">{member.membershipMonths} months</span></td>
                    <td className="px-4 py-3">₦{member.totalSavings.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${member.qualified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{member.qualified ? 'Qualified' : 'Not qualified'}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${accessTone[member.loanAccess] ?? accessTone.AUTO}`}>{accessLabel[member.loanAccess] ?? member.loanAccess}</span>{member.loanAccessReason && <span className="mt-1 block max-w-[220px] text-xs text-slate-500">Reason: {member.loanAccessReason}</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {member.loanAccess !== 'AUTO' && <button type="button" onClick={() => act(member, 'ACTIVATE')} className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">Activate</button>}
                        {member.loanAccess !== 'DEACTIVATED' && <button type="button" onClick={() => act(member, 'DEACTIVATE')} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">Deactivate</button>}
                        {isSuperAdmin && member.loanAccess !== 'OVERRIDE' && <button type="button" onClick={() => act(member, 'OVERRIDE')} className="rounded-full bg-[#6A11CB] px-3 py-1 text-xs font-bold text-white">Activate (override)</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No approved members found.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
