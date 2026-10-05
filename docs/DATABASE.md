# Database

Postgres via Prisma. Schema lives at `prisma/schema.prisma`.

## Entities

| Model | Purpose |
| --- | --- |
| `User` | Auth root. `role` is `STUDENT` / `MENTOR` / `ADMIN`. |
| `Account`, `Session`, `VerificationToken` | NextAuth plumbing. |
| `PasswordResetToken` | Scoped reset links (expiring, single-use). |
| `Profile` | Shared "about me" for every user. |
| `MentorProfile` | Public mentor record — slug, headline, rate, acceptance flag, averages, status. |
| `Category`, `Skill`, `MentorCategory`, `MentorSkill` | Taxonomy + many-to-many joins. |
| `Availability` | Mentor's weekly bookable window(s). |
| `Booking` | A session. Payments-ready fields (`amountCents`, `paymentIntentId`, `paymentStatus`). `rescheduledFromId` chains related bookings. |
| `Review` | 1:1 with a completed `Booking`. Mentor averages re-aggregated on write. |
| `SavedMentor` | A student's bookmark list. |
| `Notification` | Persisted + email-fanned-out notifications. |
| `CalendarConnection` | OAuth tokens per `(mentor, provider)`. |
| `AdminAction` | Audit log of admin actions. |

## Enums

```prisma
enum Role               { STUDENT, MENTOR, ADMIN }
enum MentorStatus       { PENDING, APPROVED, REJECTED, SUSPENDED }
enum Weekday            { SUN, MON, TUE, WED, THU, FRI, SAT }
enum BookingStatus      { PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW }
enum BookingSource      { INTERNAL, CAL_COM, CALENDLY }
enum NotificationType   { BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED,
                          BOOKING_RESCHEDULED, BOOKING_REMINDER, REVIEW_LEFT,
                          MENTOR_APPROVED, MENTOR_REJECTED, PROFILE_UPDATED, SYSTEM }
enum CalendarProvider   { CAL_COM, CALENDLY }
enum AdminActionType    { APPROVE_MENTOR, REJECT_MENTOR, SUSPEND_USER, REINSTATE_USER,
                          FEATURE_MENTOR, UNFEATURE_MENTOR, DELETE_REVIEW,
                          CREATE_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY }
```

## Indexes

Hot paths get indexes:

- `User.role`
- `MentorProfile.status`, `MentorProfile.featured`, `MentorProfile.averageRating`
- `Booking.(studentId, status)`, `Booking.(mentorProfileId, status)`, `Booking.startsAt`
- `Review.mentorProfileId`, `Review.authorId`
- `Notification.(userId, readAt)`, `Notification.createdAt`

## Invariants

- A `User` has at most **one** `MentorProfile`.
- A `Booking` has at most **one** `Review` (`Review.bookingId` is unique).
- No two active bookings overlap for the same mentor — enforced in application code inside the booking transaction.
- `Review` rating is 1..5 (validated at the Zod + application layer, not DB level).
- `MentorProfile.averageRating` / `totalReviews` are maintained by the review-creation code path, not materialized views.

## Payments-ready contract

Every `Booking` carries:

- `amountCents: Int @default(0)` — zero means free
- `currency: String @default("USD")`
- `paymentIntentId: String?` — opaque reference the payments adapter owns
- `paymentStatus: String?` — adapter-defined

There is no payment provider yet (free beta). Adding one needs an adapter in `src/services/payments` plus a webhook that sets `status = CONFIRMED` and `paymentStatus = PAID` together; the CHECK constraint above rejects anything else.


## Migrations and constraints

Schema changes ship as migrations in `prisma/migrations` (`prisma migrate deploy`), not `db push`. See [`PRODUCTION.md`](PRODUCTION.md) for the procedure for existing databases.

Invariants enforced **by the database**, so a bug in application code cannot violate them:

| Constraint | Guarantees |
| --- | --- |
| `Booking_no_overlap` (EXCLUDE, `btree_gist`) | A mentor never has two overlapping `PENDING`/`CONFIRMED` bookings. Back-to-back is fine; cancelled bookings free their time. |
| `Booking_paid_before_confirmed_check` | A priced booking can only be `CONFIRMED`/`COMPLETED` when `paymentStatus = 'PAID'`. |
| `Booking_time_order_check`, `Booking_amount_check` | `endsAt > startsAt`, `amountCents >= 0`. |
| `Availability_window_check` | `0 <= start < end <= 1440`. |
| `Review_rating_check` | rating 1..5. |
| `MentorProfile_rate_check`, `_session_length_check` | rate >= 0, session length 15-240. |

Other changes: booking foreign keys are `ON DELETE RESTRICT` (deleting a user can't erase the other party's history); `MentorProfile.timezone` is the zone availability windows are expressed in; `RateLimitBucket` backs the rate limiter; `User.passwordHash` is omitted from every Prisma query by default (`src/lib/db.ts`) and requested explicitly only by the credential check.
