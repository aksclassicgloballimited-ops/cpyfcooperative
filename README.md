# CPYIF Cooperative Platform

A responsive Next.js cooperative platform for the Circle of Prosperous Youth Interest-Free Cooperative (CPYIF). It includes a branded landing page, member dashboard, admin dashboard, and local auth/loan workflow prototypes backed by SQLite or an in-memory fallback store.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for local development

## Local development

```bash
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001

## Demo credentials

- Member: `member@cpyif.org` / `Member@123`
- Admin: `admin@cpyif.org` / `Admin@123`
- Executive: `executive@cpyif.org` / `Exec@123`

## Production build

```bash
npm run build
```

## Deployment

This app is ready to deploy to Vercel with the default Next.js build.

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Set any required environment variables from `.env.example`.
4. Deploy.

## Notes

- The project uses SQLite for local development.
- The app also includes a local fallback in-memory store when the database is unavailable.
- The landing page and member/admin dashboards are designed to match the CPYIF brand and cooperative operations flow.
