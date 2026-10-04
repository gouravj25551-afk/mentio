import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { MentorCard } from "@/components/mentor/mentor-card";
import { Empty } from "@/components/ui/empty";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Saved mentors" };

export default async function SavedMentorsPage() {
  const user = await requireRole("STUDENT");
  const saved = await db.savedMentor.findMany({
    where: { userId: user.id },
    include: {
      mentorProfile: {
        include: {
          user: true,
          categories: { include: { category: true } },
          skills: { include: { skill: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Saved mentors</h1>
        <p className="text-sm text-muted-foreground">The people you want to come back to.</p>
      </div>
      {saved.length === 0 ? (
        <Empty
          icon={<Bookmark className="h-5 w-5" />}
          title="Nothing saved yet"
          description="Save mentors as you browse to keep them one click away."
          action={<Button asChild variant="brand"><Link href="/mentors">Browse mentors</Link></Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((s) => <MentorCard key={s.id} mentor={s.mentorProfile} />)}
        </div>
      )}
    </div>
  );
}
