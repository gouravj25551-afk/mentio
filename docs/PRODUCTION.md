# Production guide

Mentio is **ready for a controlled free beta**, not for charging money. This page is the checklist for getting there safely.

## 1. Environment (set in your host's secret manager)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Must support `btree_gist` (`CREATE EXTENSION` is run by the migration). |
| `AUTH_SECRET` | yes | 32+ chars, unique per environment. Placeholder-looking values are rejected. |
| `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | yes | Same public `https://` origin. Google/OAuth callbacks are built from it. |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes | Verification and password-reset mail will not be delivered without them, so the app won't boot. The sender domain must be verified in Resend (SPF/DKIM). |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | no | Add `https://<host>/api/auth/callback/google` as a redirect URI. |
| `PAYMENTS_MODE` | no | Leave `free_beta`. |
| `CALENDAR_OAUTH_ENABLED` | no | Leave `false`. |

Do not set `SEED_*` variables in production.

## 2. Database migrations

Migrations live in `prisma/migrations`. They are applied with `prisma migrate deploy`, never `db push`.

* `20260101000000_init` is the **original** schema.
* `20261005000000_production_hardening` is additive: new columns with defaults, the `RateLimitBucket` table, `CHECK` constraints (added `NOT VALID`, so legacy rows can't block the deploy), the booking no-overlap exclusion constraint, and `ON DELETE RESTRICT` on booking foreign keys. It drops no table or column and loses no data.

### A. Brand-new database

```bash
npx prisma migrate deploy
```

### B. Existing database that was created with `prisma db push`

1. **Back up first.**
2. Check for overlapping active bookings (the old code could create them under concurrency). This must return no rows:
   ```sql
   SELECT a.id, b.id FROM "Booking" a JOIN "Booking" b
     ON a."mentorProfileId" = b."mentorProfileId" AND a.id < b.id
    AND a.status IN ('PENDING','CONFIRMED') AND b.status IN ('PENDING','CONFIRMED')
    AND tsrange(a."startsAt", a."endsAt") && tsrange(b."startsAt", b."endsAt");
   ```
   Cancel one booking of each pair if it returns anything.
3. Tell Prisma the original schema is already there, then apply the rest:
   ```bash
   npx prisma migrate resolve --applied 20260101000000_init
   npx prisma migrate deploy
   ```

This procedure was rehearsed against a legacy-shaped database with data: rows were preserved, mentor timezones were backfilled from their profiles, and a database with overlapping bookings made the migration fail **atomically** (no partial change). Recover with `npx prisma migrate resolve --rolled-back 20261005000000_production_hardening`, fix the data, and deploy again.

### Optional hardening later

Once you've confirmed legacy rows are clean, validate the constraints so they also cover old rows: `ALTER TABLE "Booking" VALIDATE CONSTRAINT "Booking_paid_before_confirmed_check";` (and the other `*_check` constraints).

## 3. Features that must stay disabled

| Feature | State | Why |
| --- | --- | --- |
| **Paid sessions** | Impossible by design | There is no payment provider. Mentors can't set a price, a priced booking returns HTTP 402, and the database rejects a priced `CONFIRMED` booking that isn't `PAID`. Do not remove these guards until a provider with webhook-confirmed payment exists. |
| **Cal.com / Calendly OAuth** (`CALENDAR_OAUTH_ENABLED`) | Off | Nothing uses a connected account: Mentio does not create events there. The OAuth request shapes follow the providers' docs but were never run against live accounts. |
| **Seed script** | Dev only | Creates fake users and an admin. It refuses to run in production. |

What works for meetings: each booking gets an unguessable Jitsi room, or the mentor's own validated link (Zoom/Meet/Teams/Whereby/Jitsi/Cal.com/Calendly host). The UI states which one it is.

## 4. Rollback

* **Code:** redeploy the previous build. The migration only adds columns (all with defaults), a table and constraints, so the old code keeps running against the new schema. The old code does still have the vulnerabilities this work fixed (password-hash leak, double-booking race), so treat a rollback as an emergency measure only.
* **Database:** prefer roll-forward. To undo the migration by hand: drop the `Booking_no_overlap` and `*_check` constraints, drop `RateLimitBucket`, and (only if you must) drop the added columns `MentorProfile.timezone/meetingLink`, `Booking.meetingKind/completedAt`. Take a backup first; dropping those columns discards their data.
* Sessions are JWTs signed with `AUTH_SECRET`. Rotating the secret signs everyone out.

## 5. Manual QA before opening the beta

1. Sign up as a student with a real inbox: receive the verification email, confirm, sign in.
2. Sign up with the same email again: the page looks identical, and the inbox gets an "already have an account" email.
3. Forgot password: receive the email, reset, old password stops working, the link can't be reused.
4. Sign up as a mentor, complete the profile (timezone, availability), confirm you are not visible in `/mentors`.
5. As admin, open the pending profile, approve it, confirm the mentor appears and gets a notification.
6. As a student on a phone, book a slot; check the time shown matches your timezone and the mentor's timezone note.
7. Two students try to book the same slot at once: exactly one succeeds.
8. Cancel, then rebook the freed slot as someone else. Reschedule: the old slot frees and the new one is taken.
9. After the session time, the mentor marks it completed; the student can then leave exactly one review.
10. Visit `/dashboard/admin` as a student and call `/api/admin/mentors/x/moderate`: redirected / 403.
11. `curl -I` the site: security headers present. Check `/robots.txt` and `/sitemap.xml`.
12. Google sign-in (if enabled), including an existing password account using the same email (it must refuse to merge).

## 6. Rate limiting on serverless

Counters live in Postgres (`RateLimitBucket`) and are updated with one atomic upsert, so limits hold across all serverless instances without extra infrastructure. It adds one small DB query per limited action (sign-in, sign-up, reset, booking, slots). If volume grows, swap `createLimiter` in `src/lib/rate-limit.ts` for Redis/Upstash; callers don't change. The limiter **fails closed**: if it can't reach the database it denies the request.

## 7. Remaining known issues

* **Legal pages:** there is no Privacy Policy or Terms of Service. Required before collecting real users' data.
* **No script CSP.** Security headers cover framing, sniffing, referrer and HSTS, but a strict `script-src` needs nonce plumbing with Next.js.
* **Dependencies:** `npm audit --omit=dev` still reports 7 findings, all in build-time tooling (Tailwind 3's `braces`/`micromatch`/`fast-glob`/`chokidar`, and PostCSS bundled in Next). They process this repo's own CSS at build time. Fixing them needs Tailwind 4 / Next 16.
* **Suspended or rejected mentors keep their existing future bookings.** They only stop receiving new ones.
* **No reminder emails or background jobs.** Bookings are not auto-completed; the mentor marks them.
* **JWT sessions can't be revoked individually** (up to 7 days). Role and existence are re-checked against the database on every authorization, so demotion and deletion take effect immediately, but a password reset does not log out other devices.
* **Google sign-in cannot link to an existing password account** (deliberately, to prevent account takeover).
* **Student-facing times on the dashboard use the timezone saved on the profile** (default UTC), not the browser's. Prompt new users to set it.
* **Free-text fields** (bio, topic, notes) are rendered as text by React, not HTML, but are not moderated or length-limited beyond the schema.
* Build prints a harmless Edge-runtime warning from `jose` (bundled by next-auth); it is never executed there.
