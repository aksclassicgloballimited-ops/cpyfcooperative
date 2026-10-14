'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { reportTypesForRole, type ReportType } from '@/lib/permissions';

const labels: Record<ReportType, string> = {
  members: 'Membership report',
  transactions: 'Financial transaction report',
  loans: 'Loan report',
  development: 'Development levy report',
  shares: 'Shares report',
};

export default function AdminReportsPage() {
  const [allowedTypes, setAllowedTypes] = useState<ReportType[]>([]);
  const [type, setType] = useState<ReportType>('transactions');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to verify reporting permissions');
        const data = await response.json();
        const permitted = reportTypesForRole(data.user?.role || '');
        setAllowedTypes(permitted);
        setType(permitted[0] || 'transactions');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load report permissions'));
  }, []);

  const run = async (format?: string) => {
    if (!allowedTypes.includes(type)) {
      setMessage('You are not allowed to view this report');
      return;
    }
    const query = new URLSearchParams({ type });
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (format) query.set('format', format);
    if (format === 'csv') {
      window.location.href = `/api/admin/reports?${query.toString()}`;
      return;
    }
    const response = await fetch(`/api/admin/reports?${query.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to load report');
      return;
    }
    setMessage('');
    setHeaders(data.headers ?? []);
    setRows(data.rows ?? []);
  };

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]">
          <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> Back to Admin
        </Link>
        <div className="rounded-[2rem] bg-[#1d1234] p-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Reporting System</p>
          <h1 className="mt-2 text-3xl font-bold">Operational &amp; Financial Reports</h1>
        </div>
        <section className="mt-6 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold">
              Report
              <select value={type} onChange={(event) => setType(event.target.value as ReportType)} className="rounded-xl border border-violet-200 px-3 py-2">
                {allowedTypes.map((report) => <option key={report} value={report}>{labels[report]}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
            <label className="grid gap-2 text-sm font-bold">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-violet-200 px-3 py-2" /></label>
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => run()} disabled={!allowedTypes.length} className="rounded-full bg-[#6A11CB] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Run</button>
              <button type="button" onClick={() => run('csv')} disabled={!allowedTypes.length} className="rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-[#6A11CB] disabled:opacity-50">CSV/Excel</button>
              <button type="button" onClick={() => window.print()} className="rounded-full border border-violet-200 px-4 py-2 text-sm font-bold text-[#6A11CB]">Print/PDF</button>
            </div>
          </div>
          {message && <p className="mt-4 text-sm font-semibold text-rose-600">{message}</p>}
        </section>
        {headers.length > 0 && (
          <section className="mt-6 overflow-x-auto rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-violet-50 text-[#4C1D95]"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
              <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-violet-100">{row.map((value, cell) => <td key={cell} className="px-4 py-3">{type === 'loans' && cell === 0 ? <Link href={`/admin/loan-record/${encodeURIComponent(value)}`} className="font-bold text-[#6A11CB]">Print application</Link> : value}</td>)}</tr>)}</tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
