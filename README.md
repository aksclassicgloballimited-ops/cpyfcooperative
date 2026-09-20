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
