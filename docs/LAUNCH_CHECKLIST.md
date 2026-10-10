# Launch checklist

**Before deploying**
- [ ] Production Supabase project created; pooled and direct URLs copied.
- [ ] Resend domain verified; API key created.
- [ ] Vercel env set: `DATABASE_URL` (pooled), `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (https), `EMAIL_FROM`, `RESEND_API_KEY`.
- [ ] `npx prisma migrate deploy` run against production. **Blocked until the duplicate init migration is resolved, see `docs/OWNER_DECISIONS.md`.**
- [ ] `npm run db:taxonomy` run against production.
- [ ] `npm run admin:bootstrap` run once; admin can sign in.
- [ ] CI green on the PR (typecheck, lint, tests, build).
- [ ] `/privacy` and `/terms` exist, but the owner must review the wording and publish the support address they refer to (`docs/OWNER_DECISIONS.md`).
- [ ] `GET /api/ready` returns `{"status":"ok"}` on the live URL.

**Smoke test on the live URL**
- [ ] Student signs up, signs in, signs out.
- [ ] Forgot password: email arrives, link opens `/reset-password` on the real domain, new password works.
- [ ] Mentor signs up: status is PENDING, not on `/mentors`, `/mentors/<slug>` is 404, not in `/sitemap.xml`.
- [ ] Admin approves the mentor: approval email arrives; mentor now appears in `/mentors`.
- [ ] Mentor sets availability and session length (sessions are free, mentors cannot set a price); student books a slot; both get a notification and email.
- [ ] Student cancels; the other person gets a notification and email.
- [ ] Admin rejects a second test mentor: the notification arrives and they stay hidden.
- [ ] Suspend a mentor who has an upcoming test booking: the admin overview and Bookings page show it under "Needs attention", and nothing was cancelled automatically.

**After launch**
- [ ] Remove `ADMIN_PASSWORD` from anywhere it was stored.
- [ ] Enable Supabase backups / point-in-time recovery if on a paid plan.
- [ ] Watch Vercel logs for JSON lines with `"level":"error"`; events are `notification.failed`, `api.unhandled`, `ready.db_unreachable` and similar. They carry ids and codes only.
