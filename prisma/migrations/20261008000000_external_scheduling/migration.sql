-- External scheduling events cannot be normal Bookings: their attendees may
-- not have Mentio accounts. Keep them as private calendar blocks instead.
CREATE TYPE "SchedulingMode" AS ENUM ('INTERNAL', 'CAL_COM', 'CALENDLY');

ALTER TABLE "MentorProfile"
  ADD COLUMN "schedulingMode" "SchedulingMode" NOT NULL DEFAULT 'INTERNAL';

CREATE TABLE "CalendarBlock" (
  "id" TEXT NOT NULL,
  "calendarConnectionId" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarBlock_calendarConnectionId_externalEventId_key"
  ON "CalendarBlock"("calendarConnectionId", "externalEventId");
CREATE INDEX "CalendarBlock_calendarConnectionId_startsAt_idx"
  ON "CalendarBlock"("calendarConnectionId", "startsAt");
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_calendarConnectionId_fkey"
  FOREIGN KEY ("calendarConnectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_time_order_check"
  CHECK ("endsAt" > "startsAt") NOT VALID;
