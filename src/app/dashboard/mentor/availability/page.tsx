import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";

export default async function AvailabilityPage() {
  const user = await requireRole("MENTOR");
  const mentor = await db.mentorProfile.findUnique({
    where: { userId: user.id },
    include: { availability: true },
  });
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding to set your availability.</p>;

  if (mentor.status !== "APPROVED") {
    return (
      <Card className="mx-auto max-w-3xl p-10 text-center">
        <h2 className="font-display text-xl font-semibold">Availability opens after approval</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {mentor.status === "PENDING"
            ? "Your application is under review. Once it's approved you can set your weekly hours here."
            : "Your mentor account isn't active, so availability can't be edited."}
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your weekly availability</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll surface slots inside this window on your mentor page.</p>
      </div>
      <AvailabilityEditor
        timezone={mentor.timezone}
        initial={mentor.availability.map((a) => ({ weekday: a.weekday, startMinutes: a.startMinutes, endMinutes: a.endMinutes }))}
      />
    </div>
  );
}
