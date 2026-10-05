import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { participantUser, publicUser } from "@/lib/public-select";
import { createBooking } from "@/features/bookings/service";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser("STUDENT");
    const booking = await createBooking(user, await readJson(req));
    return apiOk(booking, 201);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function GET() {
  try {
    const user = await requireApiUser();
    // Each role sees only its own bookings; admins see all.
    const where =
      user.role === "ADMIN" ? {} : user.role === "MENTOR" ? { mentorProfile: { userId: user.id } } : { studentId: user.id };
    const bookings = await db.booking.findMany({
      where,
      select: {
        id: true, startsAt: true, endsAt: true, status: true, topic: true, notes: true,
        meetingUrl: true, meetingKind: true, createdAt: true,
        student: { select: participantUser },
        mentorProfile: { select: { id: true, slug: true, user: { select: publicUser } } },
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });
    return apiOk(bookings);
  } catch (err) {
    return apiCatch(err);
  }
}
