# Launch checklist

Status: **blocked for full launch**. Keep `WAITLIST_MODE=true` until the database migration history is reconciled and the live signup/verification flow is tested. See [PRODUCTION.md](PRODUCTION.md) before touching production data.

**Before deploying**
- [ ] Production Supabase project created; pooled and direct URLs copied.
- [ ] Resend domain verified; API key created.
- [ ] Vercel env set: `DATABASE_URL` (pooled), `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (https), `EMAIL_FROM`, `RESEND_API_KEY`.
- [ ] Back up production; inspect `_prisma_migrations` and live schema; reconcile the duplicate `*_init` migrations in a restore/staging copy; run `npx prisma migrate status` and apply all migrations only after the history is verified.
- [ ] `npm run db:taxonomy` run against production.
- [ ] `npm run admin:bootstrap` run once; admin can sign in.
- [ ] CI green on the PR (typecheck, lint, tests, build).
- [ ] Privacy and Terms pages reviewed by the owner/legal counsel, with a real support contact and accurate data-handling promises.
- [ ] `npm audit --omit=dev` findings reviewed; framework/tooling upgrade and regression plan approved.

**Smoke test on the live URL**
- [ ] Student signs up, signs in, signs out.
- [ ] Forgot password: email arrives, link opens `/reset-password` on the real domain, new password works.
- [ ] Mentor signs up: status is PENDING, not on `/mentors`, `/mentors/<slug>` is 404, not in `/sitemap.xml`.
- [ ] Admin approves the mentor: approval email arrives; mentor now appears in `/mentors`.
- [ ] Mentor sets availability and session length; student books a free slot; both get "confirmed" emails.
- [ ] Student cancels; both get "cancelled" emails.
- [ ] Admin rejects a second test mentor: rejection email arrives and they stay hidden.

**After launch**
- [ ] Remove `ADMIN_PASSWORD` from anywhere it was stored.
- [ ] Enable Supabase backups / point-in-time recovery if on a paid plan.
- [ ] Watch Vercel logs for `email delivery failed` and `rate limiter unavailable` lines; set up alerts and a recovery path.
