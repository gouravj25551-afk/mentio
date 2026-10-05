import { requireRole } from "@/lib/auth/guards";
import { BookingDetailView } from "@/features/bookings/detail-view";

export const metadata = { title: "Booking details" };

export default async function MentorBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["MENTOR", "ADMIN"]);
  const { id } = await params;
  return <BookingDetailView viewer={viewer} bookingId={id} area="mentor" />;
}
