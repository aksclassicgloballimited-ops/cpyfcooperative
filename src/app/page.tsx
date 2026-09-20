'use client';

import { useState, type FormEvent } from 'react';

type MenuItem = {
  label: string;
  href: string;
  outline?: boolean;
  filled?: boolean;
};

const mainNavItems: MenuItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Membership', href: '#membership' },
  { label: 'Services', href: '#benefits' },
  { label: 'News', href: '#media' },
];

const moreNavItems: MenuItem[] = [
  { label: 'Our History', href: '#history' },
  { label: 'Online Meeting', href: '#portal' },
  { label: 'FAQs', href: '#faqs' },
  { label: 'Contact Us', href: '#contact' },
];

const authNavItems: MenuItem[] = [
  { label: 'Login', href: '#portal', outline: true },
  { label: 'Register Now', href: '#membership', filled: true },
];

const stats = [
  { value: '200+', label: 'Active Members' },
  { value: 'N5M+', label: 'Total Savings' },
  { value: 'N3M+', label: 'Loans Disbursed' },
  { value: '3+', label: 'Years Active' },
];

const checklist = [
  'Zero interest on all loans',
  'Flexible weekly savings plans',
  'Automated dividend distribution',
  'Transparent governance structure',
];

const benefitItems = [
  {
    title: 'Weekly Savings',
    description:
      'Build wealth consistently with structured weekly savings plans tailored to your membership type.',
  },
  {
    title: 'Interest-Free Loans',
    description:
      'Access loans with zero interest — up to 3x your savings based on your membership grade.',
  },
  {
    title: 'Share Investment',
    description:
      'Grow your wealth by investing in cooperative shares at N10,000 per unit with quarterly dividends.',
  },
  {
    title: 'Development Fund',
    description:
      'Collective development levy supports community projects and member welfare initiatives.',
  },
  {
    title: 'Weekly Meetings',
    description:
      'Stay connected with live online meetings every Wednesday for updates and decision-making.',
  },
  {
    title: 'Grade Progression',
    description:
      'Progress from Active to Silver to Golden membership, unlocking greater loan benefits.',
  },
];

const membershipPlans = [
  {
    title: 'Appearance Member',
    fee: 'N10,000 Registration fee',
    savings: 'Min. Weekly Savings N2,500',
    levy: 'Development Levy N500/week',
    perks: [
      'Weekly savings from N2,500',
      'Interest-free loan access',
      'Share ownership rights',
      'Dividend earnings',
      'Online meeting access',
    ],
    primary: true,
  },
  {
    title: 'Non-Appearance Member',
    fee: 'N15,000 Registration fee',
    savings: 'Min. Weekly Savings N3,000',
    levy: 'Development Levy N1,000/week',
    perks: [
      'Weekly savings from N3,000',
      'Interest-free loan access',
      'Share ownership rights',
      'Dividend earnings',
      'Online meeting access',
    ],
    primary: false,
  },
];

const historyStats = [
  { value: '2022', label: 'Founded' },
  { value: '2023', label: 'CAC Registered' },
  { value: '200+', label: 'Members' },
  { value: '100%', label: 'Interest-Free' },
];

const testimonials = [
  {
    name: 'Tiamiyu Saheed',
    grade: 'Silver Member',
    quote:
      'CPYIF changed my financial life. The interest-free loan helped me expand my business without the burden of interest payments.',
  },
  {
    name: 'Ayodele Azeez',
    grade: 'Active Member',
    quote:
      'The weekly savings discipline has helped me build a savings culture I never had before. I\'m proud to be a member.',
  },
  {
    name: 'Mariam Olatin',
    grade: 'Active Member',
    quote:
      'Joining CPYIF was the best financial decision I ever made. The support from executives and members is unmatched.',
  },
  {
    name: 'Abdulhameed Abdulateef',
    grade: 'Silver Member',
    quote:
      'I was able to purchase a motorcycle for my business thanks to the property loan scheme. The process was smooth and transparent.',
  },
  {
    name: 'Iyabo Ambal',
    grade: 'Active Member',
    quote:
      'The online portal makes everything so easy - I can track my savings, apply for loans, and attend meetings from anywhere.',
  },
  {
    name: 'Olanrewaju Qafar',
    grade: 'Golden Member',
    quote:
      'CPYIF has built something truly special. The trust, the transparency, and the genuine care for members\' growth sets it apart from anywhere else.',
  },
];

const footerLinks = ['Home', 'About Us', 'Our History', 'Membership', 'Services', 'News'];
const memberPortalLinks = [
  'Register',
  'Member Login',
  'Executive Login',
  'Admin Login',
  'Online Meeting',
  'FAQs',
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authStatus, setAuthStatus] = useState('');
  const [memberName, setMemberName] = useState('Member');
  const [authForm, setAuthForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    category: 'APPEARANCE',
    weeklyTarget: '2500',
  });

  const handleAuthChange = (field: string, value: string) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthStatus('Loading...');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : {
            firstName: authForm.firstName,
            lastName: authForm.lastName,
            email: authForm.email,
            phone: authForm.phone,
            password: authForm.password,
            category: authForm.category,
            weeklyTarget: Number(authForm.weeklyTarget || 2500),
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const name = data.user?.firstName ? `${data.user.firstName} ${data.user.lastName || ''}`.trim() : 'Member';
      const userRole = data.user?.role;
      setMemberName(name);
      setAuthStatus(`${authMode === 'login' ? 'Welcome back' : 'Registration successful'} — ${name}`);
      setAuthMode('login');
      setAuthForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        category: 'APPEARANCE',
        weeklyTarget: '2500',
      });

      if (typeof window !== 'undefined') {
        const destination = userRole === 'ADMIN' || userRole === 'EXECUTIVE' ? '/admin' : '/member';
        window.location.href = destination;
      }
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white text-[#1d1731] transition-colors duration-300 dark:bg-[#130c23] dark:text-white">
        <header className="sticky left-0 top-0 z-40 w-full">
          <div className="section-shell py-4">
            <div className="rounded-full border border-white/10 bg-gradient-to-r from-[#4C1D95] via-[#6A11CB] to-[#4C1D95] shadow-[0_10px_30px_rgba(17,12,26,0.35)] backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <a href="#home" className="flex items-center gap-3 text-white">
                  <img src="/cpyf-logo.jpeg" alt="CPYIF logo" className="h-11 w-11 rounded-full border border-white/50 bg-white object-cover shadow-lg" />
                  <span className="hidden text-base font-bold text-white sm:inline-block">
                    CPYIF <span className="font-medium text-violet-100">Cooperative</span>
                  </span>
                </a>

                <nav className="hidden items-center gap-1 lg:flex">
                  {mainNavItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="group relative px-3 py-2 text-sm font-medium text-violet-50 transition hover:text-white"
                    >
                      {item.label}
                      <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
                    </a>
                  ))}
                  <div className="mx-2 h-4 w-px bg-white/25" />
                  <div className="group relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-violet-50 transition hover:text-white"
                    >
                      More
                      <span className="text-[10px] transition-transform duration-300 ease-out group-hover:rotate-180">▼</span>
                    </button>
                    <div className="invisible absolute right-0 top-full z-30 w-52 origin-top-right translate-y-1 rounded-2xl border border-white/10 bg-white/95 p-2 opacity-0 shadow-2xl backdrop-blur-md transition-all duration-200 ease-out group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
                      {moreNavItems.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-violet-50 hover:text-[#6A11CB]"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </nav>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Toggle color theme"
                    onClick={() => setDarkMode(!darkMode)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/10 text-lg text-white transition duration-300 hover:bg-white/20 hover:rotate-12"
                  >
                    {darkMode ? '☀' : '☾'}
                  </button>
                  <a href="#portal" className="hidden rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:inline-flex">
                    Login
                  </a>
                  <a href="#membership" className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold text-[#4C1D95] transition hover:bg-violet-100 sm:inline-flex">
                    Register Now
                  </a>
                  <button
                    type="button"
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
                  >
                    <span className="relative block h-4 w-5">
                      <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-white transition-all duration-300 ease-out ${menuOpen ? 'top-[7px] rotate-45' : ''}`} />
                      <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-white transition-all duration-200 ease-out ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
                      <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-white transition-all duration-300 ease-out ${menuOpen ? 'top-[7px] -rotate-45' : ''}`} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <nav
            aria-hidden={!menuOpen}
            className={[
              'section-shell overflow-hidden transition-all duration-300 ease-out lg:hidden',
              menuOpen ? 'max-h-[36rem] pb-5 opacity-100' : 'pointer-events-none max-h-0 pb-0 opacity-0',
            ].join(' ')}
          >
            <div className="rounded-[1.75rem] bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-md">
              <div className="grid gap-1 sm:grid-cols-2">
                {mainNavItems.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ transitionDelay: menuOpen ? `${index * 40}ms` : '0ms' }}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-out hover:bg-violet-50 ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="my-3 flex items-center gap-3 px-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">More</span>
                <div className="h-px flex-1 bg-violet-100" />
              </div>

              <div className="grid gap-1 sm:grid-cols-2">
                {moreNavItems.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ transitionDelay: menuOpen ? `${(mainNavItems.length + index) * 40}ms` : '0ms' }}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-out hover:bg-violet-50 ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-violet-100 pt-4 sm:flex-row">
                {authNavItems.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ transitionDelay: menuOpen ? `${(mainNavItems.length + moreNavItems.length + index) * 40}ms` : '0ms' }}
                    className={[
                      'flex-1 rounded-full px-4 py-3 text-center text-sm font-bold transition-all duration-300 ease-out',
                      item.filled ? 'bg-[#6A11CB] text-white hover:bg-[#5b0fc4]' : 'border border-[#6A11CB] text-[#6A11CB] hover:bg-violet-50',
                      menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
                    ].join(' ')}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </header>

        <main>
          <section id="home" className="hero-bg overflow-hidden text-white">
            <div className="section-shell grid min-h-[680px] items-center gap-10 pb-24 pt-36 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="mb-6 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
                  ● &nbsp;Together, we prosper
                </p>
                <h1 className="text-5xl font-bold leading-[0.98] tracking-tight text-[#1d1731] sm:text-7xl">
                  Circle of Prosperous Youth
                  <span className="mt-1 block text-[#FACC15]">Interest-Free</span>
                  <span className="mt-1 block text-[#1d1731]">Cooperative</span>
                </h1>
                <p className="mt-7 max-w-xl text-base leading-7 text-purple-50 sm:text-lg">
                  Building financial prosperity together through disciplined savings, interest-free lending, and collective investment. RC No. 7379803
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-5">
                  <a href="#membership" className="rounded-full bg-white px-7 py-3.5 font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5">
                    Join Now →
                  </a>
                  <a href="#about" className="py-3.5 font-semibold text-white/90 underline-offset-4 hover:underline">
                    Learn More ↘
                  </a>
                </div>
              </div>

              <div className="relative mx-auto flex h-[340px] w-full max-w-[450px] items-center justify-center">
                <div className="absolute h-72 w-72 rounded-full border border-white/20 bg-white/10 sm:h-96 sm:w-96" />
                <div className="relative grid h-52 w-52 place-items-center rounded-full bg-white p-3 shadow-2xl sm:h-64 sm:w-64">
                  <img src="/cpyf-logo.jpeg" alt="CPYIF logo" className="h-full w-full rounded-full object-cover" />
                </div>
                <span className="absolute right-0 top-8 rounded-2xl bg-white/90 px-4 py-3 text-xs font-bold text-purple-900 shadow-lg">
                  ✦ Financial freedom
                </span>
                <span className="absolute bottom-4 left-0 rounded-2xl bg-purple-950/70 px-4 py-3 text-xs font-bold text-white backdrop-blur">
                  ↗ 200+ active members
                </span>
              </div>
            </div>

            <div className="section-shell grid grid-cols-2 border-t border-white/20 py-8 lg:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="flex items-center gap-3 py-3 lg:justify-center lg:border-r lg:border-white/15 last:border-r-0">
                  <span className="text-2xl text-[#FACC15]">{item.value === '200+' ? '◉' : item.value === 'N5M+' ? '₦' : item.value === 'N3M+' ? '↗' : '◷'}</span>
                  <div>
                    <b className="block text-xl font-bold text-white">{item.value}</b>
                    <small className="text-sm text-purple-50">{item.label}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="about" className="bg-grid py-24 sm:py-32">
            <div className="section-shell grid gap-14 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="eyebrow">ABOUT US</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">
                  Empowering Youth Through Cooperative Finance
                </h2>
                <p className="mt-6 leading-7 text-slate-600 dark:text-slate-300">
                  CPYIF is a registered cooperative society dedicated to promoting financial inclusion, interest-free lending, disciplined savings, and the economic empowerment of Nigerian youth. Founded in 2023 and formally registered with the CAC in 2024.
                </p>

                <ul className="mt-8 space-y-4">
                  {checklist.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-base font-medium text-slate-700 dark:text-slate-200">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm text-[#6A11CB] dark:bg-violet-900/40 dark:text-violet-200">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <button type="button" className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#6A11CB] px-6 py-3 font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-[#5a0fc5] dark:shadow-none">
                  Read Our Full Story <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[{image:'/cpyf-product1.jpeg', label:'CPYIF'}, {image:'/cpyf-product2.jpeg', label:'SHIRIN'}, {image:'/cpyf-oil.jpeg', label:'CPYIF'}].map((product) => (
                  <div key={product.label + product.image} className="overflow-hidden rounded-[1.5rem] border border-violet-200 bg-white shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#1d1630]">
                    <img src={product.image} alt={product.label} className="h-72 w-full object-cover" />
                    <div className="bg-gradient-to-r from-[#6A11CB] to-[#8b5cf6] p-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-white">
                      {product.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="benefits" className="py-24 sm:py-32">
            <div className="section-shell">
              <div className="text-center">
                <p className="eyebrow">BENEFITS</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">Why Join CPYIF?</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                  Everything you need to grow financially — savings, loans, shares, dividends, and community.
                </p>
              </div>

              <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {benefitItems.map((item, index) => (
                  <div key={item.title} className="card-surface p-6 text-left">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-xl text-[#6A11CB] dark:bg-violet-900/40 dark:text-violet-200">
                      {['💰', '🏦', '📈', '🤝', '📅', '🏆'][index]}
                    </div>
                    <h3 className="text-xl font-bold text-[#1d1731] dark:text-white">{item.title}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="media" className="bg-[#f8f2ff] py-24 dark:bg-[#1b132d] sm:py-32">
            <div className="section-shell">
              <div className="mb-10 text-center">
                <p className="eyebrow">MEDIA</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">Join the Movement</h2>
                <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
                  Empowering youth through interest-free financial services since 2021
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-white shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#26193e]">
                  <video
                    className="h-[320px] w-full object-cover"
                    src="/coop-video.mp4"
                    poster="/cpyf-1.jpeg"
                    controls
                    playsInline
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#160a2d] via-[#160a2d]/60 to-transparent p-6">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Media</div>
                      <h3 className="mt-2 text-2xl font-bold text-white">Watch Our Story</h3>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-red-200 bg-white shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#20162f]">
                    <img src="/become-member.jpeg" alt="Become a member" className="h-full min-h-[210px] w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#e22b2b] via-[#e22b2b]/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-100">Join today</span>
                      <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-white">BECOME A MEMBER</h3>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-white shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#20162f]">
                    <img src="/loan-free.jpeg" alt="Loan free cooperative" className="h-full min-h-[210px] w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c9a5a] via-[#0c9a5a]/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Zero interest</span>
                      <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white">LOAN FREE INTEREST COOPERATIVE</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="membership" className="py-24 sm:py-32">
            <div className="section-shell">
              <div className="mb-10 text-center">
                <p className="eyebrow">MEMBERSHIP</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">Choose Your Plan</h2>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {membershipPlans.map((plan) => (
                  <div key={plan.title} className={[
                    'rounded-[2rem] border p-8 shadow-[0_18px_60px_rgba(76,29,149,0.12)]',
                    plan.primary ? 'border-[#6A11CB] bg-gradient-to-br from-violet-50 to-white text-[#1d1731] dark:from-[#2b1d4b] dark:to-[#1d1630] dark:text-white' : 'border-violet-200 bg-white text-[#1d1731] dark:border-white/10 dark:bg-[#20162f] dark:text-white',
                  ].join(' ')}>
                    <div className="mb-6 flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-bold">{plan.title}</h3>
                      {plan.primary && <span className="rounded-full bg-[#6A11CB] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">Popular</span>}
                    </div>

                    <div className="space-y-3 border-y border-violet-200 py-5 dark:border-white/10">
                      <div className="text-base font-semibold">{plan.fee}</div>
                      <div className="text-base font-semibold">{plan.savings}</div>
                      <div className="text-base font-semibold">{plan.levy}</div>
                    </div>

                    <ul className="mt-6 space-y-3 text-base text-slate-700 dark:text-slate-300">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-sm text-[#6A11CB] dark:bg-violet-900/40 dark:text-violet-200">✓</span>
                          {perk}
                        </li>
                      ))}
                    </ul>

                    <a href={`/register?category=${plan.primary ? 'APPEARANCE' : 'NON_APPEARANCE'}`} className={[
                      'mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3.5 font-semibold transition',
                      plan.primary ? 'bg-[#6A11CB] text-white hover:bg-[#5b0fc4]' : 'border border-[#6A11CB] bg-transparent text-[#6A11CB] hover:bg-violet-50 dark:hover:bg-violet-950/30',
                    ].join(' ')}>
                      Get Started
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="history" className="cta-bg py-24 text-white sm:py-32">
            <div className="section-shell grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FACC15]">OUR HISTORY</p>
                <h2 className="mt-4 text-4xl font-bold sm:text-5xl">From 10 Members to a Thriving Community</h2>
                <p className="mt-6 max-w-2xl text-base leading-7 text-violet-100">
                  The cooperative began in early 2022 when ten dedicated members came together to address specific challenges encountered in their workplace by pooling resources and supporting one another. What started as an informal collaboration was built on trust, unity, and a shared commitment to improving the welfare of every member. Formally registered with the CAC in 2023, CPYIF has remained committed to promoting financial inclusion, interest-free lending, and the overall economic empowerment of its members.
                </p>
                <button type="button" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#1d1731] transition hover:bg-violet-100">
                  Full History <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {historyStats.map((item) => (
                  <div key={item.label} className="rounded-[1.5rem] border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-[#FACC15]">{item.value}</div>
                    <div className="mt-3 text-sm uppercase tracking-[0.2em] text-violet-100">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="testimonials" className="py-24 sm:py-32">
            <div className="section-shell">
              <div className="text-center">
                <p className="eyebrow">TESTIMONIALS</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">What Our Members Say</h2>
              </div>

              <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {testimonials.map((person) => (
                  <div key={person.name} className="card-surface p-6">
                    <div className="mb-4 flex text-lg text-[#FACC15]">★★★★★</div>
                    <p className="text-base leading-7 text-slate-600 dark:text-slate-300">“{person.quote}”</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-200 to-violet-400 text-sm font-bold text-[#6A11CB]">
                        {person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-[#1d1731] dark:text-white">{person.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-300">{person.grade}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="faqs" className="bg-[#f9f6ff] py-24 dark:bg-[#1a122b] sm:py-32">
            <div className="section-shell">
              <div className="mb-10 text-center">
                <p className="eyebrow">FAQs</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">Frequently Asked Questions</h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {[
                  'How do I become a member?',
                  'What is the minimum savings required?',
                  'How do interest-free loans work?',
                  'Can I participate online?',
                ].map((question, index) => (
                  <div key={question} className="card-surface p-6">
                    <div className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-[#6A11CB]">Q{index + 1}</div>
                    <h3 className="text-xl font-bold text-[#1d1731] dark:text-white">{question}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                      {index === 0 && 'Register online, pay the required registration fee, and complete your onboarding requirements.'}
                      {index === 1 && 'The minimum varies by membership type, starting from N2,500 weekly for Appearance Members.'}
                      {index === 2 && 'Loans are approved based on savings capacity, membership grade, and cooperative contribution history.'}
                      {index === 3 && 'Yes. Members can attend weekly online meetings and manage accounts through the member portal.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="platform" className="bg-[#F8F5FF] py-24 dark:bg-[#1b132d] sm:py-32">
            <div className="section-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div className="overflow-hidden rounded-[2rem] border border-violet-200 bg-white shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#231a3a]">
                <img src="/kenny.jpeg" alt="Akintunde Kehinde Sofiullahi" className="h-full w-full object-cover" />
              </div>

              <div>
                <p className="eyebrow">PLATFORM DEVELOPMENT</p>
                <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white sm:text-5xl">Built with Vision &amp; Dedication</h2>

                <div className="mt-8 rounded-[1.5rem] border border-violet-200 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#20162f]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#6A11CB]">LEAD DEVELOPER 3+ YEARS</div>
                  <div className="mt-4 text-2xl font-bold text-[#1d1731] dark:text-white">Akintunde Kehinde Sofiullahi</div>
                  <div className="mt-2 text-base text-slate-600 dark:text-slate-300">Fullstack Engineer - React, Node.js, TypeScript, MongoDB, AWS</div>
                </div>

                <p className="mt-8 text-base leading-7 text-slate-600 dark:text-slate-300">
                  The CPYIF Cooperative website is one of the significant achievements of Akintunde Kehinde Sofiullahi in advancing the growth and digital transformation of the cooperative. Over a period of more than three years, he conceived, planned, designed, and developed the platform as part of his broader initiative to modernize the cooperative's operations, improve service delivery, and create a sustainable digital ecosystem for all members.
                </p>

                <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#6A11CB] dark:text-violet-200">
                  <span>CONCEPTION 2022</span>
                  <span className="text-slate-400">|</span>
                  <span>DEVELOPMENT PERIOD 3+ Years</span>
                  <span className="text-slate-400">|</span>
                  <span>PLATFORM Web &amp; Mobile</span>
                </div>
              </div>
            </div>
          </section>

          <section id="portal" className="py-24 sm:py-32">
            <div className="section-shell">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div className="rounded-[2rem] border border-violet-200 bg-[#f8f2ff] p-8 dark:border-white/10 dark:bg-[#20162f]">
                  <p className="eyebrow">MEMBER PORTAL</p>
                  <h2 className="mt-4 text-4xl font-bold text-[#1d1731] dark:text-white">Welcome, {memberName}</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
                    Access savings, loan requests, meeting updates, and your cooperative profile securely from one place.
                  </p>
                  <div className="mt-7 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[#6A11CB]">✓</span> Weekly savings tracking</div>
                    <div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[#6A11CB]">✓</span> Interest-free loan applications</div>
                    <div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[#6A11CB]">✓</span> Meeting and dividend updates</div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-violet-200 bg-white p-8 shadow-[0_18px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-[#1d1630]">
                  <div className="mb-6 flex rounded-full bg-violet-100 p-1 dark:bg-[#2a1d3c]">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={['flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition', authMode === 'login' ? 'bg-[#6A11CB] text-white' : 'text-[#6A11CB]'].join(' ')}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={['flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition', authMode === 'register' ? 'bg-[#6A11CB] text-white' : 'text-[#6A11CB]'].join(' ')}
                    >
                      Register
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'register' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          First name
                          <input value={authForm.firstName} onChange={(event) => handleAuthChange('firstName', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none ring-0 transition focus:border-[#6A11CB]" />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Last name
                          <input value={authForm.lastName} onChange={(event) => handleAuthChange('lastName', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none ring-0 transition focus:border-[#6A11CB]" />
                        </label>
                      </div>
                    )}

                    {authMode === 'register' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Phone
                          <input value={authForm.phone} onChange={(event) => handleAuthChange('phone', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none ring-0 transition focus:border-[#6A11CB]" />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Membership type
                          <select value={authForm.category} onChange={(event) => handleAuthChange('category', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none transition focus:border-[#6A11CB]">
                            <option value="APPEARANCE">Appearance</option>
                            <option value="NON_APPEARANCE">Non-Appearance</option>
                          </select>
                        </label>
                      </div>
                    )}

                    {authMode === 'register' && (
                      <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Weekly target
                        <input type="number" min="2500" value={authForm.weeklyTarget} onChange={(event) => handleAuthChange('weeklyTarget', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none ring-0 transition focus:border-[#6A11CB]" />
                      </label>
                    )}

                    <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Email
                      <input type="email" value={authForm.email} onChange={(event) => handleAuthChange('email', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none ring-0 transition focus:border-[#6A11CB]" placeholder="you@example.com" />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Password
                      <input type="password" value={authForm.password} onChange={(event) => handleAuthChange('password', event.target.value)} className="rounded-xl border border-violet-200 bg-transparent px-3 py-2.5 outline-none ring-0 transition focus:border-[#6A11CB]" placeholder="••••••••" />
                    </label>

                    {authStatus && <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-[#4C1D95] dark:bg-violet-950/30 dark:text-violet-200">{authStatus}</div>}

                    <button type="submit" className="w-full rounded-full bg-[#6A11CB] px-5 py-3.5 font-bold text-white transition hover:bg-[#5b0fc4]">
                      {authMode === 'login' ? 'Member Login' : 'Create Account'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <section id="cta" className="py-24 sm:py-32">
            <div className="section-shell">
              <div className="cta-bg rounded-[2rem] px-6 py-12 text-center text-white shadow-2xl shadow-violet-300/30 sm:px-10 lg:px-16">
                <h2 className="text-4xl font-bold sm:text-5xl">Ready to Join the Circle?</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-violet-100">
                  Start your journey to financial freedom with CPYIF. Register today and become part of a growing community of prosperous youth.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
                  <a href="#membership" className="rounded-full bg-white px-7 py-3.5 font-bold text-[#1d1731] shadow-lg transition hover:bg-violet-100">
                    Register Now
                  </a>
                  <a href="#contact" className="rounded-full border border-white/40 bg-transparent px-7 py-3.5 font-bold text-white transition hover:bg-white/10">
                    Contact Us
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer id="contact" className="bg-[#1d1234] py-16 text-white">
          <div className="section-shell">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1.1fr]">
              <div>
                <div className="flex items-center gap-3">
                  <img src="/cpyf-logo.jpeg" alt="CPYIF logo" className="h-12 w-12 rounded-full border border-white/30 bg-white object-cover" />
                  <div className="text-xl font-bold">CPYIF Cooperative Society</div>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-7 text-violet-100">
                  Circle of Prosperous Youth Interest-Free Multipurpose Cooperative Society, RC No. 7379803
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">QUICK LINKS</h3>
                <ul className="mt-5 space-y-3 text-sm text-violet-100">
                  {footerLinks.map((link) => (
                    <li key={link}>{link}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">MEMBER PORTAL</h3>
                <ul className="mt-5 space-y-3 text-sm text-violet-100">
                  {memberPortalLinks.map((link) => (
                    <li key={link}>{link}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">CONTACT US</h3>
                <ul className="mt-5 space-y-3 text-sm text-violet-100">
                  <li>Nigeria</li>
                  <li>
                    <a href="tel:+2349053604770" className="transition hover:text-white">09053604770</a>
                  </li>
                  <li>
                    <a href="mailto:cpyfcooperativesociety@gmail.com" className="transition hover:text-white">cpyfcooperativesociety@gmail.com</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-violet-100">
              <div className="font-bold uppercase tracking-[0.2em] text-[#FACC15]">Bank Details</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <span>Bank: UBA</span>
                <span>Account: 2331842430</span>
                <span>Name: Circle of Prosperous Youth Forum</span>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-6 text-sm text-violet-100">
              © 2026 CPYIF Cooperative Society. All rights reserved. Privacy Policy Terms &amp; Conditions
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
