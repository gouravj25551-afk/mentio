import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata = { title: "Profile" };

export default async function StudentProfilePage() {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-sm text-muted-foreground">This is what mentors see when you book a call.</p>
      </div>
      <ProfileForm
        initial={{
          name: user.name ?? "",
          image: user.image ?? "",
          headline: profile?.headline ?? "",
          bio: profile?.bio ?? "",
          location: profile?.location ?? "",
          timezone: profile?.timezone ?? "UTC",
          twitter: profile?.twitter ?? "",
          linkedin: profile?.linkedin ?? "",
          github: profile?.github ?? "",
          website: profile?.website ?? "",
        }}
      />
    </div>
  );
}
