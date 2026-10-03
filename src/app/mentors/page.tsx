import Link from "next/link";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { listMentors } from "@/features/mentors/queries";
import { MentorCard } from "@/components/mentor/mentor-card";
import { DiscoveryFilters } from "@/components/mentor/discovery-filters";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { Search } from "lucide-react";

export const metadata = { title: "Browse mentors" };

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; skill?: string; sort?: any; page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const [{ mentors, total, pageCount }, categories, skills] = await Promise.all([
    listMentors({ ...searchParams, page }),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  const qs = (patch: Record<string, string | number | undefined>) => {
    const url = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v !== undefined && v !== "" && v !== null) url.set(k, String(v));
    }
    const s = url.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <SiteHeader />
      <main className="container pb-20 pt-10">
        <div className="flex flex-col gap-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Mentors</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {searchParams.category
              ? categories.find((c) => c.slug === searchParams.category)?.name ?? "Mentors"
              : "Find your mentor"}
          </h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} mentors ready to help.</p>
        </div>

        <DiscoveryFilters categories={categories} skills={skills} initial={searchParams} />

        {mentors.length === 0 ? (
          <Empty
            icon={<Search className="h-5 w-5" />}
            title="No mentors match that yet"
            description="Try removing a filter or searching for a different skill."
            action={<Button asChild variant="outline"><Link href="/mentors">Reset filters</Link></Button>}
            className="mt-10"
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m) => <MentorCard key={m.id} mentor={m} />)}
          </div>
        )}

        {pageCount > 1 ? (
          <div className="mt-10 flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Page {page} of {pageCount}</div>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm"><Link href={`/mentors${qs({ page: page - 1 })}`}>Previous</Link></Button>
              ) : null}
              {page < pageCount ? (
                <Button asChild variant="outline" size="sm"><Link href={`/mentors${qs({ page: page + 1 })}`}>Next</Link></Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
