# Mentio

A mentorship marketplace. Students learn from vetted mentors by booking 1:1 calls. Mentio is in early access: every mentor application is reviewed by an admin before the profile goes live.

## What it does

- **Three roles**: student, mentor, admin. Routes are gated server-side.
- **Mentor applications**: mentor sign-up creates a `PENDING` profile. Pending and rejected mentors are hidden from discovery, can't be booked, and can't set availability. Only admins approve or reject.
- **Booking**: availability windows become slots; bookings are double-booking safe; students and mentors can cancel.
- **Email** via Resend: password reset, mentor approved/rejected, booking confirmed/cancelled.
- **INR pricing config** for mentors, stored for a future payments phase. Checkout is not implemented and nothing is charged.

## Quick start

```bash
npm install
cp .env.example .env   # use a dev Supabase project; see docs/SETUP.md
npm run db:deploy
npm run db:taxonomy
npm run admin:bootstrap
npm run dev
```

Open <http://localhost:3000>. Full instructions, including Vercel and production, are in [`docs/SETUP.md`](docs/SETUP.md).

> Never run seed or demo-data scripts against production. This repo has none; see the setup guide.

---

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — detailed local + Vercel setup
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layering, directory structure, where to put what
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, indexes, invariants, payments-ready contract
- [`docs/FEATURES.md`](docs/FEATURES.md) — feature-by-feature tour of the product
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — go-live checklist

---

## Scripts

- `npm run dev` — Next.js in dev
- `npm run build` — production build (runs `prisma generate` first; needs no database)
- `npm run start` — serve the built app
- `npm run lint` · `npm run typecheck` · `npm test`
- `npm run db:deploy` — apply committed migrations (`prisma migrate deploy`)
- `npm run db:migrate:dev` — create a migration (development database only)
- `npm run db:generate` · `npm run db:studio`
- `npm run db:taxonomy` — upsert baseline categories and skills (production-safe)
- `npm run admin:bootstrap` — create or update the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`

---

## Tech

Next.js 15 (App Router, Server Actions) · TypeScript · TailwindCSS · shadcn-style components ·
Radix primitives · Framer Motion · Prisma + PostgreSQL (Supabase) · NextAuth v5 · Zod ·
TanStack Query · Recharts · Sonner · Resend ·
Cal.com + Calendly adapters.

---

## Project structure

```
src/
├── app/                    # Next.js routes
│   ├── (marketing)/        # landing, categories
│   ├── (auth)/             # sign-in, sign-up, forgot, reset
│   ├── api/                # route handlers
│   ├── dashboard/          # /student /mentor /admin dashboards
│   ├── mentors/            # discovery + [slug] profile
│   └── onboarding/mentor/  # mentor onboarding
├── components/
│   ├── ui/                 # primitives (shadcn-style)
│   ├── landing/            # hero, featured, FAQ, etc.
│   ├── mentor/             # cards, filters, save button
│   ├── booking/            # slot picker + confirm dialog
│   ├── dashboard/          # shells, tables, forms, charts
│   └── shared/             # header, footer, logo, user menu
├── features/               # business logic callers (actions, queries)
│   ├── auth/
│   ├── mentors/
│   ├── bookings/
│   └── notifications/
├── services/               # external integrations (interfaces first)
│   ├── calendar/           # Cal.com + Calendly + internal
│   ├── email/              # Resend + console fallback
│   └── payments/           # payments-ready stub
├── lib/                    # env, db, auth, utils, validators, rate-limit
└── middleware.ts           # route protection + role gates
```
