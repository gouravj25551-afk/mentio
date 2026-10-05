# Setup Guide

## Prerequisites

- Node.js **20+**
- PostgreSQL **14+** with the `btree_gist` extension (Neon, Supabase, RDS, Vercel Postgres and a stock Postgres install all have it)

## Local development

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy   # applies prisma/migrations
npm run db:seed             # dev-only demo data (see below)
npm run dev
```

`AUTH_SECRET` has **no default**. Generate one: `openssl rand -base64 32`.

In development, emails (verification links, password-reset links, booking notices) are printed to the server console instead of being sent.

### Required environment

| Variable              | What                                                         |
| --------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string                                 |
| `AUTH_SECRET`         | 32+ characters; never reuse across environments              |
| `NEXT_PUBLIC_APP_URL` | Public origin, e.g. `http://localhost:3000` (https in prod)  |

Production additionally requires `RESEND_API_KEY` and a verified `EMAIL_FROM`, an `https://` app URL, and a non-placeholder secret. The app **refuses to start** otherwise (see `src/lib/env.ts`). All variables are documented in `.env.example`.

### Optional environment

| Variable                                       | What                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`        | Enables "Continue with Google"                                       |
| `PAYMENTS_MODE`                                | Only `free_beta` exists (the default). See `docs/PRODUCTION.md`      |
| `CALENDAR_OAUTH_ENABLED` + provider credentials + `TOKEN_ENCRYPTION_KEY` | Cal.com/Calendly account linking. **Off; do not enable** (see PRODUCTION.md) |

### Database

Schema changes go through migrations, not `db push`:

```bash
npx prisma migrate dev --name <change>   # create + apply during development
npx prisma migrate deploy                # apply existing migrations (CI / production)
```

### Seed data (development only)

`npm run db:seed` creates fake mentors, students, bookings and reviews plus an admin account. It refuses to run when `NODE_ENV=production` or against a non-local database (`SEED_ALLOW_REMOTE=true` overrides the latter for a disposable staging DB). Passwords are random per run and printed at the end, or set `SEED_PASSWORD`. Demo accounts use `@mentio.test` addresses.

### Tests

```bash
npm test                 # unit + integration; needs a throwaway Postgres
npm run test:e2e         # real-browser smoke test; see header of e2e/smoke.mjs
```

The integration suite applies the real migrations to the database in `TEST_DATABASE_URL` (default `postgresql://mentio@127.0.0.1:54329/mentio_test`) and truncates tables, so it refuses any database whose name does not contain `test`.

## Deploying

See [`docs/PRODUCTION.md`](PRODUCTION.md) for the environment checklist, migration procedure, rollback and manual QA.
