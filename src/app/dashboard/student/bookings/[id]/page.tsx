import { requireUser } from "@/lib/auth/guards";
import { BookingDetailView } from "@/features/bookings/detail-view";

export const metadata = { title: "Booking details" };

export default async function StudentBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  // Admins land here too; the view itself only lets a participant or an admin through.
  return <BookingDetailView viewer={viewer} bookingId={id} area="student" />;
}
