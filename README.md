# Mentio

A direct line to the people you aspire to become — a mentorship marketplace where students book 1:1 calls with GSoC mentors, open-source maintainers, Google/Microsoft interns, founders, PMs, designers and engineers.

Built as a complete, production-grade Next.js application: real auth, real database, real booking engine, real admin tools. Not a demo.

---

## Highlights

- **Three roles with proper RBAC** — Student, Mentor, Admin. Every route is gated server-side.
- **Real auth** — NextAuth v5 (credentials + Google OAuth), bcrypt, JWT sessions, forgot/reset flow, email-verification architecture.
- **End-to-end booking engine** — availability windows → generated slots → double-booking-safe booking → cancel / reschedule / review.
- **Payments-ready, no refactor** — `services/payments` is an interface; bookings carry `paymentIntentId`, `paymentStatus`, `amountCents`. Flip the adapter on when Stripe/Razorpay arrives.
- **Calendar integrations** — Cal.com and Calendly adapters behind one interface. If credentials aren't set, the internal scheduler takes over seamlessly.
- **Premium UI** — Linear/Stripe/Cal-inspired. Tailwind, shadcn primitives, Framer Motion, dark mode, responsive to phone.
- **Notifications + email** — persisted notifications + pluggable mailer (Resend adapter; falls back to console in dev).
- **Admin dashboard** — mentor approval queue, user list, booking log, platform analytics with charts.
- **Seed script** — 20 mentors, 50 students, bookings, reviews, categories, skills — the app feels alive from `npm run db:seed`.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Env
cp .env.example .env
# fill DATABASE_URL (postgres), AUTH_SECRET (openssl rand -base64 32),
# and optionally AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET

# 3. Database
npm run db:push
npm run db:seed

# 4. Run
npm run dev
```

Open <http://localhost:3000>.

### Demo credentials (after seeding)

| Role    | Email                   | Password        |
| ------- | ----------------------- | --------------- |
| Admin   | `admin@mentio.app`      | `mentio-admin`  |
| Student | `student@mentio.app`    | `mentio-demo`   |
| Mentor  | `aarav@mentio.dev`      | `mentio-mentor` |

---

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — detailed local + Vercel setup
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layering, directory structure, where to put what
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, indexes, invariants, payments-ready contract
- [`docs/FEATURES.md`](docs/FEATURES.md) — feature-by-feature tour of the product

---

## Scripts

- `npm run dev` — Next.js in dev
- `npm run build` — production build (runs `prisma generate` first)
- `npm run start` — serve the built app
- `npm run lint` — ESLint
- `npm run typecheck` — strict TypeScript
- `npm run db:push` — push schema to database (no migration history)
- `npm run db:migrate` — generate and run a migration
- `npm run db:seed` — populate realistic demo data
- `npm run db:studio` — Prisma Studio

---

## Tech

Next.js 15 (App Router, Server Actions) · TypeScript · TailwindCSS · shadcn-style components ·
Radix primitives · Framer Motion · Prisma + PostgreSQL · NextAuth v5 · Zod ·
TanStack Query · Recharts · Sonner · UploadThing · Resend (optional) ·
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
