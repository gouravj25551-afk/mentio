import Link from "next/link";
import { Github, Instagram, Linkedin, Star, Twitter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { displayPrice } from "@/lib/pricing";

export function MentorCard({ mentor }: { mentor: any }) {
  return (
    <Link href={`/mentors/${mentor.slug}`} className="block h-full">
      <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={mentor.user.image ?? undefined} alt={mentor.user.name ?? ""} />
            <AvatarFallback>{initials(mentor.user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{mentor.user.name}</span>
              {mentor.featured ? <Badge variant="brand">Featured</Badge> : null}
            </div>
            <div className="line-clamp-2 text-sm text-muted-foreground">{mentor.headline}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {mentor.categories.slice(0, 3).map((c: any) => (
            <Badge key={c.categoryId} variant="secondary" className="text-[11px]">{c.category.name}</Badge>
          ))}
        </div>
        {(mentor.user.profile?.twitter || mentor.user.profile?.instagram || mentor.user.profile?.linkedin || mentor.user.profile?.github) ? (
          <div className="mt-4 flex items-center gap-2 text-muted-foreground" aria-label="Social links">
            {mentor.user.profile.twitter ? <Twitter className="h-4 w-4" /> : null}
            {mentor.user.profile.instagram ? <Instagram className="h-4 w-4" /> : null}
            {mentor.user.profile.linkedin ? <Linkedin className="h-4 w-4" /> : null}
            {mentor.user.profile.github ? <Github className="h-4 w-4" /> : null}
            <span className="text-xs">View experience &amp; work</span>
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          {mentor.totalReviews > 0 ? (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{mentor.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({mentor.totalReviews})</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">New mentor</span>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">{mentor.sessionLength}m · </span>
            <span className="font-medium">{displayPrice(mentor.rateCents, mentor.currency)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
