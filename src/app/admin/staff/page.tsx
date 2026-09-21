'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_OPTIONS = [
  { value: 'EXECUTIVE', label: 'Executive' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'LOAN_OFFICER', label: 'Loan Officer' },
  { value: 'MEMBERSHIP_OFFICER', label: 'Membership Officer' },
  { value: 'AUDITOR', label: 'Auditor' },
];

const roleLabel = (role: string) => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  let result = '';
  for (let i = 0; i < 12; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export default function StaffAccountsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'EXECUTIVE', password: generatePassword() });

  const loadStaff = async () => {
    const response = await fetch('/api/admin/staff', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setStaff(data.staff ?? []);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || data.user?.role !== 'SUPER_ADMIN') {
          router.replace('/admin');
          return;
        }
        setAuthorized(true);
        await loadStaff();
      } catch {
        router.replace('/admin');
      } finally {
        setChecking(false);
      }
    };
    init();
  }, [router]);

  const updateForm = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const createStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('Creating access...');
    const response = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to create staff account');
      return;
    }
    setMessage(`Access created for ${form.firstName} ${form.lastName}. Share the login email and password below with them securely — Email: ${form.email} · Password: ${form.password}`);
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'EXECUTIVE', password: generatePassword() });
    await loadStaff();
  };

  const toggleActive = async (member: StaffMember) => {
    const response = await fetch('/api/admin/staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, isActive: !member.isActive }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${member.firstName} ${member.lastName} is now ${!member.isActive ? 'active' : 'suspended'}.` : data.error || 'Unable to update account');
    if (response.ok) await loadStaff();
  };

  const changeRole = async (member: StaffMember, role: string) => {
    if (role === member.role) return;
    const response = await fetch('/api/admin/staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, role }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${member.firstName} ${member.lastName}'s role changed to ${roleLabel(role)}.` : data.error || 'Unable to update role');
    if (response.ok) await loadStaff();
  };

  const resetPassword = async (member: StaffMember) => {
    const newPassword = generatePassword();
    const response = await fetch('/api/admin/staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, password: newPassword }),
    });
    const data = await response.json();
    setMessage(response.ok ? `Password reset for ${member.firstName} ${member.lastName}. New password: ${newPassword}` : data.error || 'Unable to reset password');
  };

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f8f5ff] text-[#1d1731]">Loading...</main>;
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <a href="/admin" className="mb-5 flex items-center gap-3 text-sm font-bold text-[#6A11CB]">
          <Image src="/cpyf-logo.jpeg" alt="CPYIF logo" width={40} height={40} className="rounded-full" /> CPYIF Cooperative
        </a>
        <div className="rounded-[2rem] bg-[#1d1234] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Super Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Staff Access Management</h1>
          <p className="mt-2 max-w-3xl text-violet-100">
            Create and manage login access for Executives, Admins, Finance Officers, Loan Officers, Membership Officers, and Auditors.
          </p>
        </div>

        {message && <p className="mt-5 whitespace-pre-line rounded-xl bg-violet-100 px-4 py-3 text-sm font-semibold text-[#4C1D95]">{message}</p>}

        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Create Staff Access</h2>
          <form onSubmit={createStaff} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">First name
              <input required value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Last name
              <input required value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Email
              <input required type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Phone
              <input required value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Role
              <select value={form.role} onChange={(e) => updateForm('role', e.target.value)} className="rounded-xl border border-violet-200 px-3 py-2.5">
                {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Temporary password
              <div className="flex gap-2">
                <input required minLength={8} value={form.password} onChange={(e) => updateForm('password', e.target.value)} className="w-full rounded-xl border border-violet-200 px-3 py-2.5" />
                <button type="button" onClick={() => updateForm('password', generatePassword())} className="whitespace-nowrap rounded-xl border border-violet-200 px-3 py-2.5 text-xs font-bold text-[#6A11CB]">Regenerate</button>
              </div>
            </label>
            <button type="submit" className="sm:col-span-2 rounded-full bg-[#6A11CB] px-5 py-3 font-bold text-white">Create Access</button>
          </form>
        </section>

        <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Existing Staff Accounts</h2>
          <div className="mt-5 overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-violet-50 text-[#4C1D95]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email / Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-t border-violet-100 align-top">
                    <td className="px-4 py-3 font-semibold">{member.firstName} {member.lastName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{member.email}<br />{member.phone}</td>
                    <td className="px-4 py-3">
                      <select value={member.role} onChange={(e) => changeRole(member, e.target.value)} className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold">
                        {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {member.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => toggleActive(member)} className={`rounded-full px-3 py-1 text-xs font-bold ${member.isActive ? 'border border-rose-200 text-rose-600' : 'bg-emerald-600 text-white'}`}>
                          {member.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button type="button" onClick={() => resetPassword(member)} className="rounded-full border border-violet-200 px-3 py-1 text-xs font-bold text-[#6A11CB]">
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!staff.length && <p className="p-8 text-center text-sm text-slate-500">No staff accounts have been created yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
