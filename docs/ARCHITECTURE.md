# Architecture

Mentio is a **feature-first** Next.js 15 app. Each feature owns its queries, server actions, and components; `services/*` holds external integrations behind interfaces so swapping a provider doesn't ripple into UI code.

## Layer map

```
UI (components/) ─▶ Features (features/) ─▶ Services (services/)
                            │
                            └─▶ DB (lib/db.ts → Prisma → Postgres)
```

- **UI (`src/components/`)** — presentational and client-interactive. Never imports Prisma directly.
- **Features (`src/features/`)** — the business logic for a bounded context (auth, mentors, bookings, notifications). Owns server actions, query helpers, and feature-specific forms.
- **Services (`src/services/`)** — the only place that talks to third-party APIs. Every service exposes a typed interface and a fallback implementation so the app runs even when a provider is unconfigured.
- **Lib (`src/lib/`)** — environment, DB client, auth setup, utilities, validators, rate limiter, API response helpers.
- **App (`src/app/`)** — Next.js routes. Server components by default; client components opted into with `"use client"`.

## Route groups

- `(marketing)` — public landing + category pages, with the public header/footer.
- `(auth)` — sign-in, sign-up, forgot/reset. Has its own split-screen layout.
- `dashboard/` — role-aware shells for student / mentor / admin. Middleware blocks the wrong role before Next.js even renders.
- `mentors/` — public discovery + mentor profile page.
- `onboarding/mentor` — the "set up your mentor profile" step after signing up as a mentor.
- `api/` — Route handlers. All mutating endpoints are rate-limited at the auth layer and permission-checked.

## Auth

- NextAuth v5, JWT strategy, Prisma adapter.
- Credentials provider validates email + password against `User.passwordHash` (bcrypt).
- Google provider lights up when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.
- `middleware.ts` guards `/dashboard`, `/onboarding`, and mutation API routes, and gates role-specific areas (`/dashboard/admin` requires `ADMIN`).
- `src/lib/auth/guards.ts` provides `requireUser` / `requireRole` for server components.

## Booking engine

The booking engine is the heart of the product.

1. **Availability** — mentors store weekly windows in `Availability` (weekday + start/end minutes) in their own timezone (`MentorProfile.timezone`).
2. **Slot generation** — `lib/booking-rules.ts#generateSlots` (pure, DST-aware) expands the next N days, subtracts active bookings and the 1-hour notice window; `features/bookings/slots.ts` feeds it from the database.
3. **Create booking** — `features/bookings/service.ts#createBooking` runs in a transaction behind per-mentor and per-student advisory locks, re-validates that the start is a genuinely offered slot, checks overlaps, then inserts. The `Booking_no_overlap` constraint is the backstop.
4. **Cancel / reschedule / complete** — same service. Reschedule cancels the old booking and creates a linked new one in one transaction. Only the mentor can mark a finished session completed, which unlocks the review.
5. **Meeting URL** — `services/calendar#resolveMeeting` returns the mentor's validated link or a generated Jitsi room. No network call, so it can't fail.

## Payments-ready contract

There is no payment provider: Mentio is a free beta. `services/payments` exports a guard that refuses any priced booking (HTTP 402), mentors cannot set a price, and the database rejects a priced `CONFIRMED` booking that isn't `PAID`. See [`PRODUCTION.md`](PRODUCTION.md) before adding a provider.

## RBAC

```
Public:   /, /mentors, /mentors/[slug], /categories
Student:  /dashboard/student/**
Mentor:   /dashboard/mentor/**
Admin:    /dashboard/admin/**
```

Every page, route handler and server action re-reads the user's role from the database (`lib/auth/guards.ts`). The edge middleware only checks "signed in" and blocks cross-site writes; it is not the authorization boundary, because a JWT role can be stale.

## Error handling

- Zod validation on every public input (`lib/validators.ts`).
- API routes funnel errors through `apiCatch` in `lib/api.ts` → consistent JSON shape `{ error }`.
- Server actions throw structured errors; forms surface them via Sonner toasts.
