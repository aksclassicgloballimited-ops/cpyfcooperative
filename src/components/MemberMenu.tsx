'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { disableMobilePush } from '@/components/NativeMemberNav';

type Entry = { label: string; icon: string; href?: string; badge?: boolean };

const groups: Entry[][] = [
  [
    { label: 'Add Savings', icon: '💰', href: '/member/savings' },
    { label: 'Loan Plan', icon: '🏦', href: '/loans' },
    { label: 'Buy Shares', icon: '📈', href: '/member/shares' },
    { label: 'Download Statement', icon: '📄' },
  ],
  [
    { label: 'Notifications', icon: '🔔', href: '/member/notifications', badge: true },
    { label: 'Guarantors', icon: '🤝', href: '/member/guarantors' },
    { label: 'ID Card', icon: '🪪', href: '/member/id-card' },
    { label: 'Documents', icon: '📁', href: '/member/documents' },
    { label: 'Profile Settings', icon: '⚙️', href: '/member#profile-settings' },
  ],
];

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function MemberMenu({ unread = 0 }: { unread?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const downloadStatement = async () => {
    setNote('Preparing statement...');
    try {
      const response = await fetch('/api/transactions', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const rows = (data.transactions ?? []) as Array<{ createdAt: string; type: string; description: string; amount: number; status: string; reference: string }>;
      const header = ['Date', 'Type', 'Description', 'Amount (NGN)', 'Status', 'Reference'].join(',');
      const body = rows.map((row) => [new Date(row.createdAt).toISOString().slice(0, 10), row.type, row.description, row.amount, row.status, row.reference].map(csvCell).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `CPYIF-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setNote('');
      setOpen(false);
    } catch {
      setNote('Unable to download statement. Try again.');
    }
  };

  const logout = async () => {
    await disableMobilePush();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/#portal');
  };

  const row = 'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#1d1731] transition hover:bg-violet-50 hover:text-[#6A11CB]';
  const iconBox = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-base transition group-hover:bg-violet-200';

  return (
    <div className="relative shrink-0">
      <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative flex h-12 w-12 flex-col items-center justify-center gap-[5px] rounded-2xl border border-white/30 bg-white/15 shadow-lg backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
        <span className={`h-0.5 w-6 rounded-full bg-white transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
        <span className={`h-0.5 w-6 rounded-full bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
        <span className={`h-0.5 w-6 rounded-full bg-white transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
        {unread > 0 && !open && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-[#1d1234]">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && <>
        <div className="fixed inset-0 z-40 bg-[#1d1234]/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
        <nav className="absolute right-0 top-16 z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-[0_24px_60px_rgba(76,29,149,0.3)]">
          <div className="bg-gradient-to-r from-[#4C1D95] to-[#6A11CB] px-5 py-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-200">CPYIF Cooperative</p>
            <p className="text-lg font-bold">Member Menu</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {groups.map((group, index) => (
              <div key={index} className={index > 0 ? 'mt-2 border-t border-violet-100 pt-2' : ''}>
                {group.map((entry) => {
                  const content = <><span className={iconBox}>{entry.icon}</span><span className="flex-1">{entry.label}</span>{entry.badge && unread > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-[#1d1234]">{unread}</span>}</>;
                  return entry.href
                    ? <Link key={entry.label} href={entry.href} onClick={() => setOpen(false)} className={row}>{content}</Link>
                    : <button key={entry.label} type="button" onClick={downloadStatement} className={row}>{content}</button>;
                })}
              </div>
            ))}
            <div className="mt-2 border-t border-violet-100 pt-2">
              <button type="button" onClick={logout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-base">🚪</span>Logout
              </button>
            </div>
            {note && <p className="px-3 py-2 text-xs font-semibold text-slate-500">{note}</p>}
          </div>
        </nav>
      </>}
    </div>
  );
}
