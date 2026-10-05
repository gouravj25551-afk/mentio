# Setup Guide

Mentio runs on Next.js, NextAuth (Auth.js v5) and Prisma. Supabase is used **only as managed PostgreSQL**: no Supabase Auth, Storage or client SDK.

## Prerequisites

- Node.js **20.12+** (22 recommended; CI uses 22)
- A Supabase project (free tier is fine to start)
- A Resend account with a verified sending domain (production only)

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Required | What |
| --- | --- | --- |
| `DATABASE_URL` | yes | **Pooled** Supabase URL (Supavisor transaction mode, port `6543`, ends with `?pgbouncer=true`). Used by the app at runtime. |
| `DIRECT_URL` | for migrations | **Direct** Supabase URL (port `5432`). Used only by `prisma migrate`. |
| `AUTH_SECRET` | yes | 32+ random bytes: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | yes | Public URL, `https://…` in production. Used for links in emails. |
| `EMAIL_FROM` | production | Sender, e.g. `Mentio <hello@your-domain>`. Domain must be verified in Resend. |
| `RESEND_API_KEY` | production | Resend API key. See [Email](#email-resend). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | bootstrap only | Read by `npm run admin:bootstrap`. Password: 12+ chars with upper, lower and a digit. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | optional | Enables "Continue with Google". |
| `CAL_COM_*`, `CALENDLY_*` | optional | Calendar integrations. |

In production (`NODE_ENV=production`, which includes `next build`), the app refuses to start if `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (https), `EMAIL_FROM` or `RESEND_API_KEY` is missing, or if `AUTH_SECRET` is the development default. Errors name the variable, never its value.

Where to find the Supabase URLs: **Project → Connect → ORM → Prisma**. Copy the pooled string into `DATABASE_URL` and the direct string into `DIRECT_URL`. If your network is IPv4-only, use the session-mode pooler URL (port `5432` on the pooler host) for `DIRECT_URL`.

## Local setup (Supabase)

Use a **separate Supabase project for development**. Do not point local `.env` at production.

```bash
npm install
cp .env.example .env        # fill DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:deploy           # applies committed migrations to the dev database
npm run db:taxonomy         # baseline categories and skills (idempotent)
npm run admin:bootstrap     # creates your admin (needs ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev
```

Open <http://localhost:3000>. Without `RESEND_API_KEY`, emails (including password reset links) are printed to the dev server console.

### Changing the schema

```bash
# edit prisma/schema.prisma, then, against the DEV database only:
npm run db:migrate:dev -- --name describe_change
git add prisma/migrations
```

Commit the generated migration. Production only ever receives committed migrations through `npm run db:deploy`.

## Migrations

| Command | Use |
| --- | --- |
| `npm run db:deploy` | `prisma migrate deploy`. Applies pending committed migrations. Safe for production. |
| `npm run db:migrate:dev` | `prisma migrate dev`. Creates migrations. **Development database only.** |
| `npm run db:generate` | Regenerates the Prisma client (also runs on `npm install` and `npm run build`). |
| `npm run db:studio` | Opens Prisma Studio. |

Do **not** use `prisma db push` for production. It bypasses migration history.

The initial migration (`prisma/migrations/20261005000000_init`) assumes an **empty** database.

## Production setup

1. Create the production Supabase project and copy both connection strings.
2. From your machine, with production values in the **shell** (not a committed file):
   ```bash
   DATABASE_URL="…pooled…" DIRECT_URL="…direct…" npm run db:deploy
   DATABASE_URL="…pooled…" DIRECT_URL="…direct…" npm run db:taxonomy
   DATABASE_URL="…pooled…" DIRECT_URL="…direct…" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="…" npm run admin:bootstrap
   ```
3. Deploy (see Vercel below).
4. Sign in at `/sign-in` with the admin account and approve mentors at **Dashboard → Mentors**.

> ⚠️ **Never seed production.** There is no demo seed script in this repo. `db:taxonomy` only upserts categories and skills; `admin:bootstrap` only creates or updates the single account in `ADMIN_EMAIL`. Do not add or run scripts that create fake users, bookings or reviews against production.

## Vercel

1. Import the GitHub repo into Vercel. The framework preset is Next.js; the build command is `npm run build`.
2. Add environment variables for **Production** (and Preview if you use it, ideally with a separate database): `DATABASE_URL` (pooled), `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (your final `https://` URL), `EMAIL_FROM`, `RESEND_API_KEY`.
   `DIRECT_URL` is not needed at runtime; keep it on your machine or CI for migrations.
3. Run migrations (step 2 above) **before** the first deploy, and before deploying any release that contains a new migration.
4. Deploy. The build does not connect to the database.
5. Optional Google sign-in: add `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and set the redirect URI to `https://YOUR_DOMAIN/api/auth/callback/google`.

## Email (Resend)

1. Create an account at resend.com and **verify your sending domain** (add the DNS records Resend shows you).
2. Create an API key with "Sending access" and set it as `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on the verified domain.

Emails sent: password reset, mentor approved, mentor rejected, booking confirmed, booking cancelled. Reset links use `NEXT_PUBLIC_APP_URL`. If an email fails after a booking has been saved, the failure is logged and the booking stays.

Until your domain is verified, Resend only delivers to your own account email, which is not enough for real users.

## Admin

The only way to create an admin is `npm run admin:bootstrap`. Re-running it with the same `ADMIN_EMAIL` resets that account's password and keeps it an admin. There is no browser-based admin sign-up, and sign-up cannot request the ADMIN role.

## Production notes

- Rate limiting is in-memory and per-instance; swap in a shared store (e.g. Upstash) via `src/lib/rate-limit.ts` before real traffic.
- Payments are not implemented. Mentors can store an INR price (paise) for later; bookings confirm immediately and nothing is charged.
