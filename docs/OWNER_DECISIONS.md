# Decisions only the owner can make

These are the remaining owner and operational decisions. The migration history finding below has been resolved in the repository, but production still needs a safe baseline.

## 1. Production schema baseline and backup (blocks opening the app)

On 2026-10-12 the Supabase production project had `User`, `MentorProfile`, and `RateLimitBucket`, but **no `_prisma_migrations` table**. Neither init migration was recorded. The duplicate `20261005000000_init` has therefore been removed from the repo so fresh databases and CI can migrate cleanly. No production schema or data was changed.

Production still lacks at least `MentorProfile.schedulingMode` (observed in live build logs). The project overview reported no backups. Before enabling the full app: arrange a recoverable backup, compare the live schema against each migration, baseline only changes already present, then apply the remaining migrations in order and confirm `/api/ready` is healthy. Do not run `prisma migrate deploy` blindly against this untracked, partially upgraded database.

## 2. Support address
`/privacy`, `/terms` and error pages refer to a "support address listed on the site". None exists. Pick one and add it.

## 3. Cancellation and refund policy
Sessions are free during the beta, so nothing is refunded. There is no rule for who may cancel when, or what happens to a student whose mentor is rejected or suspended. Today: nothing is cancelled automatically; admins see affected sessions under "Needs attention" and cancel them one by one if they choose.

## 4. Legal copy
`/privacy` and `/terms` are draft text. Have them reviewed before collecting real users' data.

## 5. Notify students when their mentor is suspended or rejected?
Today the student is not told until an admin cancels. Whether to message them, and what to promise, is a policy choice.

## 6. Pricing
Payments are not implemented. Mentors cannot set a price and a priced booking is refused.
