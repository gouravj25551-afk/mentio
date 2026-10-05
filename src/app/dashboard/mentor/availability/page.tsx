import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";

export default async function AvailabilityPage() {
  const user = await requireRole(["MENTOR", "ADMIN"]);
  const mentor = await db.mentorProfile.findUnique({
    where: { userId: user.id },
    include: { availability: true },
  });
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding to set your availability.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your weekly availability</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll surface slots inside this window on your mentor page.</p>
      </div>
      <AvailabilityEditor
        initial={mentor.availability.map((a) => ({ weekday: a.weekday, startMinutes: a.startMinutes, endMinutes: a.endMinutes }))}
      />
    </div>
  );
}
