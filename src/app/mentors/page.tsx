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
import { discoverySchema } from "@/lib/validators";

export const metadata = { title: "Browse mentors" };

export default async function MentorsPage({
  searchParams: rawSearchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await rawSearchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  // Invalid values fall back to defaults instead of reaching the query layer.
  const parsed = discoverySchema.safeParse(flat);
  const searchParams = parsed.success ? parsed.data : discoverySchema.parse({});
  const page = searchParams.page;
  const [{ mentors, total, pageCount }, categories, skills] = await Promise.all([
    listMentors(searchParams),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  const qs = (patch: Record<string, string | number | undefined>) => {
    const url = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (k === "perPage" || v === undefined || v === "" || v === null) continue;
      if ((k === "page" && Number(v) === 1) || (k === "sort" && v === "recommended")) continue;
      url.set(k, String(v));
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

        <DiscoveryFilters categories={categories} skills={skills} initial={{ q: searchParams.q, category: searchParams.category, skill: searchParams.skill, sort: searchParams.sort }} />

        {mentors.length === 0 ? (
          <Empty
            icon={<Search className="h-5 w-5" />}
            title={total === 0 ? "Mentors are joining soon" : "No mentors match that yet"}
            description={total === 0
              ? "We are onboarding our first verified mentors. Check back soon, or apply to mentor on Mentio."
              : "Try removing a filter or searching for a different skill."}
            action={total === 0
              ? <Button asChild variant="outline"><Link href="/sign-up?role=MENTOR">Become a mentor</Link></Button>
              : <Button asChild variant="outline"><Link href="/mentors">Reset filters</Link></Button>}
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
