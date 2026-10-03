import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, initials } from "@/lib/utils";
import type { MentorProfile, User, MentorCategory, Category } from "@prisma/client";

type Row = MentorProfile & { user: User; categories: (MentorCategory & { category: Category })[] };

export function FeaturedMentors({ mentors }: { mentors: Row[] }) {
  if (!mentors.length) return null;
  return (
    <section className="container py-20">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Featured mentors</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Hand-picked. Vetted. Available this week.
          </h2>
        </div>
        <Button asChild variant="ghost">
          <Link href="/mentors">View all<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => (
          <Link key={m.id} href={`/mentors/${m.slug}`}>
            <Card className="group h-full p-5 transition hover:border-foreground/20 hover:shadow-lg">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={m.user.image ?? undefined} alt={m.user.name ?? ""} />
                  <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.user.name}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{m.headline}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{m.averageRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.categories.slice(0, 3).map((c) => (
                  <Badge key={c.categoryId} variant="brand">{c.category.name}</Badge>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                <span className="text-muted-foreground">{m.sessionLength}m call</span>
                <span className="font-medium">{formatMoney(m.rateCents, m.currency)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
