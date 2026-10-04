# Setup Guide

## Prerequisites

- Node.js **20+** (use `nvm` or `fnm`)
- PostgreSQL **14+** (local, Neon, Supabase, or Railway all work)
- (Optional) A Google Cloud OAuth app for Google sign-in

## Local

```bash
npm install
cp .env.example .env
```

### Required env

| Variable                | What                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                               |
| `AUTH_SECRET`           | 32+ byte secret — `openssl rand -base64 32`                |
| `NEXT_PUBLIC_APP_URL`   | `http://localhost:3000` in dev                             |

### Optional env

| Variable                                    | What                                               |
| ------------------------------------------- | -------------------------------------------------- |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`     | Enables the "Continue with Google" button          |
| `RESEND_API_KEY`                            | Sends real emails. Without it, mail logs to stdout |
| `CAL_COM_CLIENT_ID` / `CAL_COM_CLIENT_SECRET` | Enables Cal.com OAuth and real meeting creation  |
| `CALENDLY_CLIENT_ID` / `CALENDLY_CLIENT_SECRET` | Enables Calendly OAuth                        |
| `UPLOADTHING_TOKEN`                         | Enables avatar uploads (otherwise avatars = seeded images) |

Any provider whose credentials are missing is auto-detected and gracefully disabled (sign-in page hides the Google button, calendars page shows "not configured", mailer prints to console).

### Database

```bash
npm run db:push    # no migration history — fast for dev
# or
npm run db:migrate # proper migration with history
npm run db:seed
```

Seeded data:

- 11 categories, 36 skills
- 20 mentors (one approved for each category), 50 students, 1 admin
- 60 bookings (past + future), ~40 reviews
- A fully populated admin notification

### Dev server

```bash
npm run dev
```

### Demo credentials

| Role    | Email                   | Password        |
| ------- | ----------------------- | --------------- |
| Admin   | `admin@mentio.app`      | `mentio-admin`  |
| Student | `student@mentio.app`    | `mentio-demo`   |
| Mentor  | `aarav@mentio.dev`      | `mentio-mentor` |

Rotate these before deploying anywhere real.

## Vercel

1. Push to GitHub, import on Vercel.
2. Add a managed Postgres (Vercel Postgres, Neon, Supabase).
3. Set `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (= your Vercel URL).
4. First deploy: run `npm run db:push && npm run db:seed` once (`vercel env pull` locally, then run against the production DB).
5. (Optional) Add Google OAuth credentials with the Vercel URL as the callback.

Build command is `npm run build` which runs `prisma generate` automatically.

## Prod notes

- Rate limiting is in-memory and per-process — swap in Upstash Ratelimit via `src/lib/rate-limit.ts`.
- Email uses Resend when `RESEND_API_KEY` is set. Any Nodemailer-shaped mailer works — see `src/services/email`.
- Payments are stubbed. Add a Stripe adapter to `src/services/payments` and switch the exported instance.
