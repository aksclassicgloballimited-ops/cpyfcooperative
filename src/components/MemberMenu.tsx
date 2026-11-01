'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { disableMobilePush } from '@/components/NativeMemberNav';

const links = [
  { label: 'Add Savings', href: '/member/savings' },
  { label: 'Loan Plan', href: '/loans' },
  { label: 'Buy Shares', href: '/member/shares' },
];
const moreLinks = [
  { label: 'Notifications', href: '/member/notifications' },
  { label: 'Guarantors', href: '/member/guarantors' },
  { label: 'ID Card', href: '/member/id-card' },
  { label: 'Documents', href: '/member/documents' },
  { label: 'Profile Settings', href: '/member#profile-settings' },
];

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function MemberMenu() {
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
      const rows = (data.transactions ?? []) as Array<{ createdAt: string; type: string; description: string; amount: number; status: string; reference: string; balanceAfter?: number | null }>;
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

  const item = 'block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#1d1731] hover:bg-violet-50';

  return (
    <div className="relative">
      <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-2xl leading-none text-white hover:bg-white/25">☰</button>
      {open && <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <nav className="absolute left-0 top-14 z-50 w-64 rounded-2xl border border-violet-200 bg-white p-2 shadow-2xl">
          {links.map((entry) => <Link key={entry.label} href={entry.href} onClick={() => setOpen(false)} className={item}>{entry.label}</Link>)}
          <button type="button" onClick={downloadStatement} className={item}>Download Statement</button>
          {moreLinks.map((entry) => <Link key={entry.label} href={entry.href} onClick={() => setOpen(false)} className={item}>{entry.label}</Link>)}
          <button type="button" onClick={logout} className={`${item} text-rose-600`}>Logout</button>
          {note && <p className="px-4 py-2 text-xs font-semibold text-slate-500">{note}</p>}
        </nav>
      </>}
    </div>
  );
}
