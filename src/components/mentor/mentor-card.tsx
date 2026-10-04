import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, initials } from "@/lib/utils";

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
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{mentor.averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({mentor.totalReviews})</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">{mentor.sessionLength}m · </span>
            <span className="font-medium">{formatMoney(mentor.rateCents, mentor.currency)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
