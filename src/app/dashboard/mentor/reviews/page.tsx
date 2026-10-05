import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { formatDate, initials } from "@/lib/utils";
import { Empty } from "@/components/ui/empty";

export default async function MentorReviewsPage() {
  const user = await requireRole("MENTOR");
  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id } });
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding first.</p>;
  const reviews = await db.review.findMany({
    where: { mentorProfileId: mentor.id },
    include: { author: true, booking: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">Honest feedback from your students.</p>
      </div>
      {reviews.length === 0 ? (
        <Empty title="No reviews yet" description="They'll show up here after your first completed call." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9"><AvatarImage src={r.author.image ?? undefined} /><AvatarFallback>{initials(r.author.name)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{r.author.name ?? "Student"}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "stroke-current opacity-30"}`} />)}
                  </div>
                  {r.comment ? <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p> : null}
                  <div className="mt-2 text-xs text-muted-foreground">Session: {r.booking.topic}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
