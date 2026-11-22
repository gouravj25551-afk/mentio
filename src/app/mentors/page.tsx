import Link from "next/link";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { listCategoriesWithCounts, listMentors } from "@/features/mentors/queries";
import { MentorGrid } from "@/components/mentor/mentor-grid";
import { PageIntro } from "@/components/shared/page-intro";
import { CategoryIcon } from "@/components/shared/icons";
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
    listCategoriesWithCounts(),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  const active = searchParams.category ? categories.find((c) => c.slug === searchParams.category) : undefined;

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
      <main id="main-content" tabIndex={-1} className="pb-24 outline-none">
        <PageIntro
          eyebrow={active ? "Category" : "Mentors"}
          title={active ? active.name : "Find the mentor"}
          accent={active ? undefined : "who gets it."}
          description={active?.description ?? "Vetted engineers, maintainers, founders and designers. Pick a category, open a profile, book a call."}
        >
          {active ? (
            <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-white/70">
              <CategoryIcon name={active.icon} className="h-3.5 w-3.5" style={{ color: active.color ?? undefined }} />
              {total.toLocaleString()} {total === 1 ? "mentor" : "mentors"} in {active.name}
            </div>
          ) : null}
        </PageIntro>

        <div className="container -mt-12">
        <DiscoveryFilters categories={categories} skills={skills} />

        <p className="mt-10 text-sm text-muted-foreground" aria-live="polite">{total.toLocaleString()} {total === 1 ? "mentor" : "mentors"}{searchParams.q ? ` for “${searchParams.q}”` : ""}</p>

        {mentors.length === 0 ? (
          <Empty
            icon={<Search className="h-5 w-5" />}
            title={total === 0 && !searchParams.q && !searchParams.category && !searchParams.skill ? "Mentors are joining soon" : "No mentors match that yet"}
            description={total === 0 && !searchParams.q && !searchParams.category && !searchParams.skill
              ? "We are onboarding our first verified mentors. Check back soon, or apply to mentor on Mentio."
              : "Try another category, remove a filter, or search for a different skill."}
            action={total === 0 && !searchParams.q && !searchParams.category && !searchParams.skill
              ? <Button asChild variant="outline"><Link href="/sign-up?role=MENTOR">Become a mentor</Link></Button>
              : <Button asChild variant="outline"><Link href="/mentors">Reset filters</Link></Button>}
            className="mt-6"
          />
        ) : (
          <div className="mt-6">
            <MentorGrid mentors={mentors} resultKey={JSON.stringify(searchParams)} />
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
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
