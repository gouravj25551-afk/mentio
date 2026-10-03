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

1. **Availability** — mentors store weekly windows in `Availability` (weekday + start/end minutes).
2. **Slot generation** — `features/bookings/slots.ts` expands the next N days of availability, subtracts active bookings, and returns ISO slot ranges.
3. **Create booking** — `features/bookings/actions.ts#createBooking` runs a double-booking check (`overlap` query inside a transaction), then creates the row and fires notifications.
4. **Cancel / reschedule** — reschedule creates a new booking linked via `rescheduledFromId` and cancels the old one atomically.
5. **Meeting URL** — created by `services/calendar`, which picks the right adapter based on the mentor's `CalendarConnection`.

## Payments-ready contract

Bookings carry `amountCents`, `currency`, `paymentIntentId`, `paymentStatus`. The booking flow currently creates a `NoopPayments` intent that immediately succeeds. To add Stripe:

```ts
// src/services/payments/index.ts
export const payments: PaymentsAdapter = new StripePayments(env.STRIPE_SECRET_KEY);
```

…and wire a `payments.createIntent(...)` call into `createBooking` right before the DB write. No schema change.

## RBAC

```
Public:   /, /mentors, /mentors/[slug], /categories
Student:  /dashboard/student/**
Mentor:   /dashboard/mentor/**  (ADMIN also allowed)
Admin:    /dashboard/admin/**
```

Protected server actions re-check role on every call. The middleware is a UX convenience, not the security boundary.

## Error handling

- Zod validation on every public input (`lib/validators.ts`).
- API routes funnel errors through `apiCatch` in `lib/api.ts` → consistent JSON shape `{ error }`.
- Server actions throw structured errors; forms surface them via Sonner toasts.
