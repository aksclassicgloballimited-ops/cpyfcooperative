# CPYIF Cooperative Platform

A responsive Next.js cooperative platform for the Circle of Prosperous Youth Interest-Free Cooperative (CPYIF). It includes a branded landing page, member dashboard, admin dashboard, and database-backed auth and loan workflows using PostgreSQL.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

## Local development

```bash
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001

## Accounts

Members create accounts through the registration form. Executive and admin accounts
must be created or promoted directly in the production database by an authorized
administrator; public registration always creates a `MEMBER` account.

Do not commit or share production passwords. Use the login form with the credentials
assigned to each account.

## Production build

```bash
npm run build
```

## Deployment

This app is ready to deploy to Vercel with a real production database.

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add the environment variables below in Project Settings → Environment Variables.
4. Set the build command to:

```bash
npx prisma generate && npx prisma db push && npm run build
```

5. Deploy. The build command applies the Prisma schema to the configured PostgreSQL database before compiling the app.

### Required Vercel environment variables

```env
DATABASE_URL="postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="https://www.cpyfcooperative.com"
```

For preview or local dev, set the corresponding preview/local values as needed.

## Notes

- PostgreSQL is required for local and production database-backed authentication.
- Production deployments must use PostgreSQL.
- The app includes a local fallback in-memory store when the database is unavailable, but that is not suitable for a live production site because it resets on deploy/restart.
- The landing page and member/admin dashboards are designed to match the CPYIF brand and cooperative operations flow.
# Membership categories and financial controls

Approved members are assigned an `ACTIVE`, `SILVER`, or `GOLDEN` membership grade. Administrators can configure the display name, category duration, savings threshold, loan multiplier, minimum membership period, and automatic classification from `/admin/settings`.

Savings entries and reversals are recorded in the `Transaction` ledger with the acting administrator, balance after the entry, status, and reversal reference. Share allocations and reductions are recorded in `ShareTransaction` and update the member's `ShareHolding` in one database transaction. The admin dashboard includes posting controls and a savings CSV export.

Member loan applications are checked against the configured category multiplier and minimum membership period. Members can request any amount up to their current category limit; applications above the limit are rejected by the API.

## Loan management

The `/loans` page lists active General, Property, and Commodity loan products and includes a product-specific calculator. Members apply through `/loans/apply`, a six-step form that captures loan, property, guarantor, and document information. Each submitted application receives a `LOAN/YYYY/XXXXX` application number and is visible in the member dashboard.

Administrators manage product limits, fees, repayment terms, eligibility requirements, activation, and application review from `/admin/loans`. Product configuration is stored in `LoanProduct`; commodity inventory is exposed through `/api/commodities`. Processing fees and repayment totals are calculated from the selected product rather than a universal hard-coded rule.
