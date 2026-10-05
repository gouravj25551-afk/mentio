-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('INTERNAL_ROOM', 'EXTERNAL_LINK');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_mentorProfileId_fkey";

-- AlterTable
ALTER TABLE "MentorProfile" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "meetingKind" "MeetingKind" NOT NULL DEFAULT 'INTERNAL_ROOM';

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- CreateIndex
CREATE INDEX "Booking_mentorProfileId_startsAt_idx" ON "Booking"("mentorProfileId", "startsAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_mentorProfileId_fkey" FOREIGN KEY ("mentorProfileId") REFERENCES "MentorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written safety constraints (not expressible in schema.prisma).
-- All CHECKs are NOT VALID: they apply to every new/updated row immediately
-- without scanning (or failing on) legacy rows. Once existing data is known
-- clean, run `ALTER TABLE ... VALIDATE CONSTRAINT <name>;` at leisure.
-- ---------------------------------------------------------------------------

-- Carry each mentor's existing timezone over to the new MentorProfile.timezone.
UPDATE "MentorProfile" mp
SET "timezone" = p."timezone"
FROM "Profile" p
WHERE p."userId" = mp."userId" AND p."timezone" IS NOT NULL AND p."timezone" <> '';

-- Double-booking is impossible at the database level: two PENDING/CONFIRMED
-- bookings for the same mentor can never overlap in time. Back-to-back
-- sessions are fine because tsrange is half-open [start, end).
--
-- PRE-FLIGHT: this fails if overlapping active bookings already exist (the
-- previous app code had a race that could create them). Check first with:
--   SELECT a.id, b.id FROM "Booking" a JOIN "Booking" b
--     ON a."mentorProfileId" = b."mentorProfileId" AND a.id < b.id
--    AND a.status IN ('PENDING','CONFIRMED') AND b.status IN ('PENDING','CONFIRMED')
--    AND tsrange(a."startsAt", a."endsAt") && tsrange(b."startsAt", b."endsAt");
-- and cancel one booking of each pair before deploying.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "mentorProfileId" WITH =,
    tsrange("startsAt", "endsAt") WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_time_order_check" CHECK ("endsAt" > "startsAt") NOT VALID;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_amount_check" CHECK ("amountCents" >= 0) NOT VALID;

-- A booking with a price can only be CONFIRMED/COMPLETED once it is PAID, so
-- booking status and payment status can never contradict each other.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paid_before_confirmed_check"
  CHECK ("status" NOT IN ('CONFIRMED', 'COMPLETED') OR "amountCents" = 0 OR "paymentStatus" = 'PAID') NOT VALID;

ALTER TABLE "Availability" ADD CONSTRAINT "Availability_window_check"
  CHECK ("startMinutes" >= 0 AND "endMinutes" <= 1440 AND "endMinutes" > "startMinutes") NOT VALID;

ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5) NOT VALID;

ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_rate_check" CHECK ("rateCents" >= 0) NOT VALID;
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_session_length_check"
  CHECK ("sessionLength" BETWEEN 15 AND 240) NOT VALID;
