# Launch checklist

**Before deploying**
- [ ] Production Supabase project created; pooled and direct URLs copied.
- [ ] Resend domain verified; API key created.
- [ ] Vercel env set: `DATABASE_URL` (pooled), `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (https), `EMAIL_FROM`, `RESEND_API_KEY`.
- [ ] `npm run db:deploy` run against production (empty DB).
- [ ] `npm run db:taxonomy` run against production.
- [ ] `npm run admin:bootstrap` run once; admin can sign in.
- [ ] CI green on the PR (typecheck, lint, tests, build).
- [ ] Privacy policy and terms pages published and linked (not in this branch).

**Smoke test on the live URL**
- [ ] Student signs up, signs in, signs out.
- [ ] Forgot password: email arrives, link opens `/reset-password` on the real domain, new password works.
- [ ] Mentor signs up: status is PENDING, not on `/mentors`, `/mentors/<slug>` is 404, not in `/sitemap.xml`.
- [ ] Admin approves the mentor: approval email arrives; mentor now appears in `/mentors`.
- [ ] Mentor sets availability, session length and price; student books a slot; both get "confirmed" emails.
- [ ] Student cancels; both get "cancelled" emails.
- [ ] Admin rejects a second test mentor: rejection email arrives and they stay hidden.

**After launch**
- [ ] Remove `ADMIN_PASSWORD` from anywhere it was stored.
- [ ] Enable Supabase backups / point-in-time recovery if on a paid plan.
- [ ] Watch Vercel logs for `[email] … failed` lines.
