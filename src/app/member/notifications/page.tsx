'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Notice = { id: string; title: string; body: string; readAt?: string | null; createdAt: string };
export default function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const load = () => fetch('/api/notifications').then((r) => r.json()).then((data) => setItems(data.notifications ?? []));
  useEffect(() => { load(); }, []);
  const markAll = async () => { await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }); load(); };
  return <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><Link href="/member" className="font-bold text-[#6A11CB]">← Back to dashboard</Link><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[2rem] bg-[#1d1234] p-7 text-white"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Member Portal</p><h1 className="mt-2 text-3xl font-bold">Notifications</h1></div><button type="button" onClick={markAll} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">Mark all as read</button></div><div className="mt-6 space-y-3">{items.map((item) => <article key={item.id} className={`rounded-2xl border p-5 ${item.readAt ? 'border-violet-100 bg-white' : 'border-violet-300 bg-violet-50'}`}><div className="flex items-start justify-between gap-3"><h2 className="font-bold">{item.title}</h2><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</time></div><p className="mt-2 text-sm text-slate-600">{item.body}</p></article>)}{!items.length && <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">No notifications yet.</p>}</div></div></main>;
}
