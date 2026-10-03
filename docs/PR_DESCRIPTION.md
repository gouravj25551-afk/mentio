# Mentio — initial production build

## Overview

This PR brings Mentio from an empty repo to a complete, production-ready mentorship marketplace. Three roles, real auth, a real booking engine, a real admin panel, and a seeded database that makes the app feel alive the moment it boots.

The architecture is deliberately payments-agnostic: every booking already carries `amountCents` / `paymentIntentId` / `paymentStatus`, and `services/payments` is a swappable adapter. Dropping Stripe in later requires zero schema changes.

## Features

### For students
- Browse 20 seeded mentors across 11 categories with search, filter, sort, pagination
- Mentor profile with 14-day slot picker, rating distribution, review feed, save-to-list
- Dashboard: upcoming + past bookings, cancel, reschedule, leave review (updates mentor averages atomically)
- Saved mentors, notifications, profile settings
- Password + Google OAuth sign-in, forgot/reset flow

### For mentors
- Onboarding flow that provisions the `MentorProfile` on first visit
- Overview with next 5 sessions, latest reviews, lifetime earnings
- Availability editor (per-weekday windows)
- 30-day analytics chart (Recharts)
- Cal.com + Calendly OAuth connections (adapters live even without credentials)
- Full profile editor: rate, session length, categories, skills, portfolio, achievements, accepting-bookings toggle

### For admins
- Mentor approval queue with Approve / Reject / Suspend / Feature actions and an audit log
- User list, platform booking log, category metrics
- Platform-wide analytics dashboard with growth %, 30-day volume chart

## Architecture

- **Next.js 15 App Router**, strict TypeScript, Tailwind + shadcn-style primitives + Framer Motion
- **NextAuth v5** with Prisma adapter, JWT sessions, Credentials + Google providers
- **Prisma + Postgres** with indexes on hot paths and payments-ready fields on `Booking`
- **Feature-first layering**: `components/` → `features/` → `services/` → `lib/db`. UI never imports Prisma; services never bleed into UI.
- **Service abstractions** for calendar (Cal.com / Calendly / internal), email (Resend / console), and payments (noop today, Stripe-ready).
- **Server-side RBAC**: `middleware.ts` + `requireRole` guards on every protected view and action.
- **Zod everywhere** at system boundaries; a small in-memory rate limiter protects auth; API errors funnel through one helper.

## Database

- 14 models, 10 enums, indexes on hot paths — see [`docs/DATABASE.md`](docs/DATABASE.md)
- Seed script generates: 11 categories, 36 skills, 20 mentors (all approved), 50 students, 1 admin, 60 bookings (past + future), ~40 reviews
- Non-trivial invariants (one review per booking, no overlapping active bookings, mentor averages recomputed on every review) are enforced in application code with transactional writes

## Screenshots

> _Add screenshots here — landing, mentor profile with slot picker, student dashboard, mentor analytics, admin mentor queue._

## Setup

```bash
cp .env.example .env   # fill DATABASE_URL + AUTH_SECRET
npm install
npm run db:push
npm run db:seed
npm run dev
```

Demo accounts (post-seed):
- Admin — `admin@mentio.app` / `mentio-admin`
- Student — `student@mentio.app` / `mentio-demo`
- Mentor — `aarav@mentio.dev` / `mentio-mentor`

See [`docs/SETUP.md`](docs/SETUP.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Future improvements

- Stripe adapter in `services/payments` + checkout UI
- Reminder emails scheduled via a cron (Vercel Cron / Inngest)
- UploadThing wiring for custom avatars (schema and env already in place)
- Replace in-memory rate limiter with Upstash Ratelimit
- Fine-grained mentor search facets (languages, timezone compatibility)
- End-to-end tests (Playwright) covering the booking lifecycle

🤖 Generated with [Claude Code](https://claude.com/claude-code)
