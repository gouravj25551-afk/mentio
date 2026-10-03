import { redirect } from "next/navigation";

export default async function MentorBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Reuse the student booking detail view — it's role-aware.
  redirect(`/dashboard/student/bookings/${id}`);
}
