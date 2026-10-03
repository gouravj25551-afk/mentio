import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { createBooking } from "@/features/bookings/actions";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const body = await req.json();
    const booking = await createBooking(body);
    return apiOk(booking, 201);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHENTICATED", 401);
  const where = session.user.role === "MENTOR"
    ? { mentorProfile: { userId: session.user.id } }
    : { studentId: session.user.id };
  const list = await db.booking.findMany({
    where,
    include: { mentorProfile: { include: { user: true } }, student: true },
    orderBy: { startsAt: "desc" },
    take: 50,
  });
  return apiOk(list);
}
