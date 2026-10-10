# Mentio

A direct line to the people you aspire to become — a mentorship marketplace where students book 1:1 calls with GSoC mentors, open-source maintainers, Google/Microsoft interns, founders, PMs, designers and engineers.

A Next.js application with real auth, a real database, a transactional booking engine and admin tools. Currently a **free beta**: see [`docs/PRODUCTION.md`](docs/PRODUCTION.md) for what is and is not production-ready.

---

## Highlights

- **Three roles, enforced on the server** — Student, Mentor, Admin. Roles are re-read from the database on every authorization, never trusted from the session token.
- **Auth** — NextAuth v5 (email + password with email verification, optional Google), bcrypt, forgot/reset flow with hashed single-use tokens, no user enumeration, database-backed rate limits.
- **Booking engine** — mentor-timezone availability → generated slots → transactional, double-booking-proof booking (advisory locks plus a database exclusion constraint) → cancel / reschedule / complete / review.
- **Free beta, honestly** — no payment provider exists, so every session is free and paid bookings are impossible rather than faked. See [`docs/PRODUCTION.md`](docs/PRODUCTION.md).
- **Meeting links** — an unguessable Jitsi room per booking, or the mentor's own validated link. Mentors can switch scheduling to Cal.com or Calendly (`schedulingMode`); busy times imported by verified webhooks hide matching slots. Mentio itself does not create events in those tools.
- **Notifications + email** — persisted notifications plus Resend email (required in production; console in development).
- **Admin dashboard** — mentor approval queue (complete profiles only), moderation, users, bookings, analytics.
- **Tests** — integration tests against a real Postgres (`npm test`) and a browser smoke test (`npm run test:e2e`).
- **Operations** — `GET /api/health` (liveness) and `GET /api/ready` (database check) return only `{"status": ...}`. Logs are structured and never contain emails, tokens or error messages (`src/lib/log.ts`).

---

## Quick start

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)
npx prisma migrate deploy   # needs Postgres with btree_gist
npm run db:taxonomy         # idempotently load public categories and skills
npm run dev
```

Open <http://localhost:3000>. In development, emails (verification and reset links) are printed to the server console.

There are no demo accounts or seeded mentors. Create the admin with `npm run admin:bootstrap` and add real mentors through the normal sign-up/onboarding and admin approval flow.

---

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — local setup and environment
- [`docs/OWNER_DECISIONS.md`](docs/OWNER_DECISIONS.md) — open decisions only the owner can make
- [`docs/PRODUCTION.md`](docs/PRODUCTION.md) — production checklist, migrations, rollback, QA, known issues
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layering, directory structure, where to put what
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, indexes, invariants, payments-ready contract
- [`docs/FEATURES.md`](docs/FEATURES.md) — feature-by-feature tour of the product

---

## Scripts

- `npm run dev` — Next.js in dev
- `npm run build` — production build (runs `prisma generate` first)
- `npm run start` — serve the built app
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`)
- `npm run typecheck` — strict TypeScript
- `npm run db:migrate` — create and apply a migration (development)
- `npm run db:taxonomy` — idempotently load categories and skills (no users or mentors)
- `npm test` — unit + integration tests (needs a throwaway Postgres)
- `npm run test:e2e` — real-browser smoke test
- `npm run db:studio` — Prisma Studio

---

## Tech

Next.js 15 (App Router, Server Actions) · TypeScript · TailwindCSS · shadcn-style components ·
Radix primitives · Framer Motion · Prisma + PostgreSQL · NextAuth v5 · Zod ·
TanStack Query · Recharts · Sonner · Resend · Vitest · Playwright (e2e).

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
│   ├── calendar/           # meeting links (+ disabled OAuth)
│   ├── email/              # Resend + console fallback
│   └── payments/           # free-beta guard; no provider
├── lib/                    # env, db, auth, utils, validators, rate-limit
└── middleware.ts           # route protection + role gates
```
