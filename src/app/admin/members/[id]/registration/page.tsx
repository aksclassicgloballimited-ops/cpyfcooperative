'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Member = Record<string, string | null | undefined> & {
  membership?: { membershipNo: string | null; category: string; grade: string; status: string; weeklyTarget: number; joinedAt?: string | null } | null;
};

const dateText = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

export default function RegistrationFormPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/members?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load registration form');
        if (!data.members?.[0]) throw new Error('Member not found');
        setMember(data.members[0]);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load registration form'));
  }, [id]);

  if (error) return <main className="p-10 text-center text-rose-600">{error}</main>;
  if (!member) return <main className="p-10 text-center">Loading...</main>;

  const sections: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: 'Personal Information',
      rows: [
        ['First name', member.firstName || '—'],
        ['Last name', member.lastName || '—'],
        ['Email', member.email || '—'],
        ['Phone', member.phone || '—'],
        ['Date of birth', dateText(member.dateOfBirth)],
        ['Gender', member.gender || '—'],
        ['Address', member.address || '—'],
        ['State', member.state || '—'],
        ['Local government', member.localGovernment || '—'],
        ['Nationality', member.nationality || '—'],
        ['Occupation', member.occupation || '—'],
        ['Income range', member.incomeRange || '—'],
        ['Referral code', member.referralCode || '—'],
      ],
    },
    {
      title: 'Membership Details',
      rows: [
        ['Membership number', member.membership?.membershipNo || '—'],
        ['Membership type', member.membership?.category === 'NON_APPEARANCE' ? 'Non-Appearance Member' : 'Appearance Member'],
        ['Grade', member.membership?.grade || '—'],
        ['Status', member.membership?.status || '—'],
        ['Weekly savings target', `₦${Number(member.membership?.weeklyTarget || 0).toLocaleString()}`],
        ['Date registered', dateText(member.createdAt)],
        ['Date approved', dateText(member.membership?.joinedAt)],
      ],
    },
    {
      title: 'Emergency Contact',
      rows: [
        ['Name', member.emergencyName || '—'],
        ['Phone', member.emergencyPhone || '—'],
        ['Relationship', member.emergencyRelationship || '—'],
        ['Alternative phone', member.emergencyAltPhone || '—'],
        ['Alternative email', member.emergencyAltEmail || '—'],
      ],
    },
    {
      title: 'Next of Kin / Nominee',
      rows: [
        ['Name', member.nomineeName || '—'],
        ['Phone', member.nomineePhone || '—'],
        ['Relationship', member.nomineeRelationship || '—'],
        ['Alternative phone', member.nomineeAltPhone || '—'],
        ['Alternative email', member.nomineeAltEmail || '—'],
        ['Address', member.nomineeAddress || '—'],
      ],
    },
  ];

  const idDocument = member.identificationDocument;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-[#1d1731] print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link href="/admin/members" className="font-bold text-[#6A11CB]">← Back to members</Link>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-[#6A11CB] px-5 py-2 font-bold text-white">Download PDF / Print</button>
      </div>
      <article className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow print:max-w-none print:rounded-none print:shadow-none">
        <header className="flex items-center gap-4 border-b-2 border-[#6A11CB] pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cpyf-logo.jpeg" alt="CPYIF logo" className="h-20 w-20 rounded-full object-cover" />
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-[#4C1D95]">Circle of Prosperous Youth Interest-Free Cooperative</h1>
            <p className="text-sm text-slate-600">RC No. 7379803 · Membership Registration Form</p>
          </div>
          {member.passportPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.passportPhoto} alt="Passport" className="h-28 w-24 rounded border border-slate-300 object-cover" />
          ) : (
            <div className="flex h-28 w-24 items-center justify-center rounded border border-dashed border-slate-300 text-center text-xs text-slate-400">No passport</div>
          )}
        </header>

        {sections.map((section) => (
          <section key={section.title} className="mt-5 break-inside-avoid">
            <h2 className="bg-violet-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-[#4C1D95]">{section.title}</h2>
            <dl className="grid grid-cols-2 gap-x-6 text-sm">
              {section.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-200 py-1.5">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {idDocument?.startsWith('data:image') && (
          <section className="mt-5 break-inside-avoid">
            <h2 className="bg-violet-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-[#4C1D95]">Identification Document</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={idDocument} alt="Identification document" className="mx-auto mt-3 max-h-64 object-contain" />
          </section>
        )}

        <section className="mt-5 break-inside-avoid text-sm">
          <h2 className="bg-violet-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-[#4C1D95]">Declaration</h2>
          <p className="mt-2 text-slate-600">Terms and conditions accepted on {dateText(member.termsAcceptedAt)}.</p>
          <div className="mt-10 grid grid-cols-2 gap-10 text-center text-xs text-slate-500">
            <div className="border-t border-slate-400 pt-1">Member signature</div>
            <div className="border-t border-slate-400 pt-1">Authorised officer signature &amp; date</div>
          </div>
        </section>
      </article>
    </main>
  );
}
