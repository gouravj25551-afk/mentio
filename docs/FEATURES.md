# Features

## Public

### Landing page (`/`)
Hero, social proof, featured mentors (DB-driven), how-it-works, categories grid, benefits, testimonials, FAQ, CTA, footer. Animated with Framer Motion. Dark + light.

### Mentor discovery (`/mentors`)
- Search by name/headline/bio
- Category chips (also deep-linkable: `/mentors?category=gsoc`)
- Skill filter
- Sort: recommended / top-rated / most-booked / newest
- Pagination
- Empty state with "reset filters"

### Mentor profile (`/mentors/[slug]`)
- Avatar + headline + rating badges + response time + timezone
- Categories & skills chips
- Tabs: About / Experience / Reviews
- Rating distribution bar chart (1..5)
- 14-day slot picker + booking confirm dialog
- Save-to-list button

### Categories (`/categories`)
Grid of all categories, deep-linking into discovery.

## Auth

- `/sign-in` — password + optional Google OAuth
- `/sign-up` — role toggle (Student / Mentor), feeds into either `/dashboard/student` or `/onboarding/mentor`
- `/forgot-password` — emails a single-use, 1-hour link (stored hashed); same response whether or not the email exists
- `/verify-email` — confirms the address; login is blocked until then
- `/reset-password?token=…` — resets if valid and unused
- Password rules: 8-72 chars with upper, lower and a digit (Zod enforced)
- Rate limits (Postgres-backed, shared across instances): sign-in 10/10 min per email and 30 per IP, sign-up, reset and booking limits

## Student dashboard (`/dashboard/student`)

- Overview — upcoming calls, completed, saved count
- Bookings — upcoming + past tabs; join, reschedule, cancel, leave review (after the mentor marks the session completed)
- Booking detail — meeting link, context, review form after completion
- Saved mentors — grid of bookmarks
- Notifications — list, auto-marks read on view
- Profile — name, headline, bio, location, timezone, socials

## Mentor dashboard (`/dashboard/mentor`)

- Overview — upcoming calls, 30-day completed, avg rating, total sessions
- Bookings — same table as student but role-aware
- Availability — weekday + start/end windows (15-minute grid, no overlaps), shown in the mentor's timezone
- Reviews — reverse-chronological, with the session's topic
- Analytics — 30-day bookings chart + growth %
- Meeting link — optional own link (validated); otherwise a Mentio video room
- Profile — headline, bio, experience, rate, session length, categories, skills, portfolio, achievements, accepting-bookings toggle

## Admin dashboard (`/dashboard/admin`)

- Overview — users, approved/pending mentors, bookings, avg rating + 30-day volume chart
- Mentors — tabs for Pending / Approved / Rejected / Suspended with inline Approve / Reject / Suspend / (Un)feature actions
- Users — paginated list with roles
- Bookings — platform-wide log
- Categories — list with mentor counts
- Analytics — growth %, chart, review activity

## Services

### Meeting links (`services/calendar`)
Each booking gets either a freshly generated, unguessable Jitsi room (`INTERNAL_ROOM`) or the mentor's own link (`EXTERNAL_LINK`: https only, allow-listed Zoom/Meet/Teams/Whereby/Jitsi/Cal.com/Calendly hosts). The booking page says which. **Mentio does not create events in Cal.com or Calendly.** Optional OAuth account linking exists behind `CALENDAR_OAUTH_ENABLED` (off; state-checked, tokens encrypted) but nothing uses a linked account.

### Email (`services/email`)
Resend in production (required; the app won't boot without it), console in development. Delivery failure never fails the action that triggered it.

### Payments (`services/payments`)
None. Free beta: mentors can't set a price and a priced booking is refused (HTTP 402). The database also rejects a priced booking that is confirmed but unpaid.

## Notifications

- Persisted to `Notification` table
- Fanned out via `services/email` on creation
- Types: booking lifecycle, mentor approval/rejection, reviews, system
- Shown in dashboard sidebar + dedicated page; auto-marked read on view
