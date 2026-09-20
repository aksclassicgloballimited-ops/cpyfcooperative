'use client';

import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

const inputClass = 'rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#6A11CB]';

function RegistrationForm() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') === 'NON_APPEARANCE' ? 'NON_APPEARANCE' : 'APPEARANCE';
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set('category', category);
    data.set('weeklyTarget', category === 'NON_APPEARANCE' ? '3000' : '2500');
    const password = String(data.get('password') ?? '');
    const confirmation = String(data.get('confirmPassword') ?? '');
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Registration failed');
      window.location.href = '/member';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f4ff] px-4 py-10 text-[#1d1731] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="text-sm font-bold text-[#6A11CB]">← Back to CPYIF</a>
        <div className="mt-5 rounded-[2rem] bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-100">Membership registration</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Join CPYIF</h1>
          <p className="mt-2 text-violet-100">Complete your information to create your secure member account.</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-6">
          <Section title="Personal Information">
            <Field name="firstName" label="First Name" required /><Field name="lastName" label="Last Name" required />
            <Field name="dateOfBirth" label="Date of Birth" type="date" required />
            <Select name="gender" label="Gender" options={['Female', 'Male', 'Other']} />
            <Field name="phone" label="Phone Number" required /><Field name="email" label="Email Address" type="email" required />
            <Field name="address" label="Residential Address" required full /><Field name="state" label="State" required />
            <Field name="localGovernment" label="Local Government" required /><Field name="nationality" label="Nationality" required />
          </Section>
          <Section title="Employment / Business Information">
            <Field name="occupation" label="Occupation" required />
            <Select name="incomeRange" label="Monthly Income Range" options={['Below N50,000', 'N50,000 - N100,000', 'N100,001 - N250,000', 'Above N250,000']} />
          </Section>
          <Section title="Emergency Information">
            <Field name="emergencyName" label="Emergency Contact Name" required /><Field name="emergencyPhone" label="Emergency Contact Phone" required />
            <Field name="emergencyRelationship" label="Relationship" required />
          </Section>
          <Section title="Nominee Information">
            <Field name="nomineeName" label="Nominee Name" required /><Field name="nomineePhone" label="Nominee Phone" required />
            <Field name="nomineeRelationship" label="Relationship" required /><Field name="nomineeAddress" label="Nominee Address" required full />
          </Section>
          <Section title="Account Information">
            <Field name="password" label="Password" type="password" required /><Field name="confirmPassword" label="Confirm Password" type="password" required />
            <div className="grid gap-2 text-sm"><label className="font-semibold">Membership plan</label><div className="rounded-xl bg-violet-50 px-3 py-2.5 font-semibold">{category === 'APPEARANCE' ? 'Appearance Member — N2,500 weekly minimum' : 'Non-Appearance Member — N3,000 weekly minimum'}</div></div>
          </Section>
          <Section title="Required Documents">
            <FileField name="passportPhoto" label="Passport photograph (maximum 25 KB)" />
            <FileField name="identificationDocument" label="Identification document (maximum 25 KB)" />
          </Section>
          <label className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-white p-4 text-sm">
            <input name="termsAccepted" value="true" type="checkbox" required className="mt-1 accent-[#6A11CB]" />
            <span>I accept the CPYIF cooperative terms and conditions. <a href="/cpyfterm.pdf" target="_blank" rel="noreferrer" className="font-bold text-[#6A11CB] underline">Read the terms</a>.</span>
          </label>
          {message && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p>}
          <button disabled={submitting} className="w-full rounded-full bg-[#6A11CB] px-5 py-3.5 font-bold text-white disabled:opacity-60">{submitting ? 'Submitting...' : 'Create Member Account'}</button>
        </form>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-[1.5rem] bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-5 text-xl font-bold text-[#4C1D95]">{title}</h2><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>;
}
function Field({ name, label, type = 'text', required = false, full = false }: { name: string; label: string; type?: string; required?: boolean; full?: boolean }) {
  return <label className={`grid gap-2 text-sm font-semibold ${full ? 'sm:col-span-2' : ''}`}>{label}<input name={name} type={type} required={required} className={inputClass} /></label>;
}
function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<select name={name} required className={inputClass}><option value="">Select</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
function FileField({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-2 text-sm font-semibold"><span>{label}</span><input name={name} type="file" accept="image/*,.pdf" required className={inputClass} /></label>;
}

export default function RegisterPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f4ff] p-10 text-[#1d1731]">Loading registration form...</main>}><RegistrationForm /></Suspense>;
}
