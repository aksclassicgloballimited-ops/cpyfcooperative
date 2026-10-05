import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | CPYIF Cooperative",
  description: "How CPYIF Cooperative collects, uses and protects member information.",
};

const sections = [
  {
    title: "Information we collect",
    body: "When you apply for membership, we may collect your name, contact details, date of birth, gender, address, state and local government, nationality, occupation, income range, passport photograph, identification document, emergency contact and nominee details. To provide cooperative services, we also process membership status, savings and share records, loan applications and repayments, payment receipts or transaction references, account activity and communications with the cooperative.",
  },
  {
    title: "How we use information",
    body: "We use this information to assess and administer membership, verify identity and payments, maintain cooperative financial records, provide savings, share and loan services, communicate account and meeting updates, protect accounts and meet applicable legal and regulatory obligations. We do not sell member personal information.",
  },
  {
    title: "Mobile app and notifications",
    body: "If you enable notifications in the CPYIF mobile app, we process a device push token and platform type to deliver cooperative account updates through Google Firebase Cloud Messaging on Android or Apple Push Notification service on iOS. You can turn off notifications in your device settings. Signing out of the app removes that device's registered token from the cooperative account.",
  },
  {
    title: "Cookies, hosting and service providers",
    body: "The site uses a necessary, HttpOnly session cookie to keep you signed in. The platform is hosted using cloud web and database services and uses an email provider for account communications such as password reset links. These providers process data only to provide their services to the cooperative. Payment is made to the cooperative's bank account; this site does not request or store bank card details.",
  },
  {
    title: "Access, security and retention",
    body: "Access to member information is restricted according to staff duties. We use access controls and technical safeguards to protect account information. We retain records for as long as required to administer membership, maintain financial records, resolve disputes and meet applicable legal obligations, after which they are securely deleted or anonymised where practicable.",
  },
  {
    title: "Your choices and questions",
    body: "You may request access to or correction of your personal information by contacting the cooperative. Some records may need to be retained where required for financial or legal purposes. Contact us at cpyfcooperativesociety@gmail.com or 07053604770 with privacy questions or requests.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ff] px-4 py-10 text-[#1d1731] sm:px-6">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-bold text-[#6A11CB]">← CPYIF Cooperative</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#6A11CB]">Privacy</p>
        <h1 className="mt-2 text-3xl font-extrabold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: 4 October 2026</p>
        <p className="mt-5 leading-7 text-slate-600">
          Circle of Prosperous Youth Interest-Free Cooperative (CPYIF) explains below how member and applicant information is handled on the website and mobile app. This policy should be read together with the cooperative&apos;s membership terms.
        </p>
        {sections.map((section) => (
          <section key={section.title} className="mt-7">
            <h2 className="text-lg font-bold text-[#4C1D95]">{section.title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{section.body}</p>
          </section>
        ))}
        <p className="mt-8 border-t border-violet-100 pt-5 text-xs leading-5 text-slate-500">
          This policy describes the current platform in general terms. Contact the cooperative for clarification about a particular record or processing activity.
        </p>
      </article>
    </main>
  );
}
