# Features

## Public

### Landing page (`/`)
Hero, featured mentors (DB-driven, hidden when empty), how-it-works, categories grid, benefits, FAQ, CTA, footer. Animated with Framer Motion. Dark + light.

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
- `/forgot-password` — generates a single-use token, prints the dev link
- `/reset-password?token=…` — resets if valid and unused
- Password rules: 8+ chars with uppercase and a digit (Zod enforced)
- Rate-limited sign-in (10 attempts / 10 min / email)

## Student dashboard (`/dashboard/student`)

- Overview — upcoming calls, completed, saved count
- Bookings — upcoming + past tabs; cancel + join + leave review
- Booking detail — meeting link, context, review form after completion
- Saved mentors — grid of bookmarks
- Notifications — list, auto-marks read on view
- Profile — name, headline, bio, location, timezone, socials

## Mentor dashboard (`/dashboard/mentor`)

- Overview — upcoming calls, 30-day completed, avg rating, lifetime earnings
- Bookings — same table as student but role-aware
- Availability — weekday + start/end windows editor
- Reviews — reverse-chronological, with the session's topic
- Analytics — 30-day bookings chart + growth %
- Calendars — Cal.com / Calendly OAuth (gracefully disables when creds are missing)
- Profile — headline, bio, experience, rate, session length, categories, skills, portfolio, achievements, accepting-bookings toggle

## Admin dashboard (`/dashboard/admin`)

- Overview — users, approved/pending mentors, bookings, avg rating + 30-day volume chart
- Mentors — tabs for Pending / Approved / Rejected / Suspended with inline Approve / Reject / Suspend / (Un)feature actions
- Users — paginated list with roles
- Bookings — platform-wide log
- Categories — list with mentor counts
- Analytics — growth %, chart, review activity

## Services

### Calendar (`services/calendar`)
Three adapters behind one interface:

| Adapter | When used |
| --- | --- |
| `InternalAdapter` | Default. Generates meeting URLs; always works. |
| `CalComAdapter` | When `CAL_COM_*` env is set AND the mentor has an active `CalendarConnection(provider=CAL_COM)` |
| `CalendlyAdapter` | Same, for Calendly |

Falls back to internal silently on any failure.

### Email (`services/email`)
`ConsoleMailer` by default (logs); `ResendMailer` when `RESEND_API_KEY` is set. All notifications fan out through this.

### Payments (`services/payments`)
Not wired into bookings yet; `NoopPayments` is a placeholder. Interface designed for a drop-in Stripe/Razorpay adapter.

## Notifications

- Persisted to `Notification` table
- Fanned out via `services/email` on creation
- Types: booking lifecycle, mentor approval/rejection, reviews, system
- Shown in dashboard sidebar + dedicated page; auto-marked read on view
