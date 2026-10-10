import { SiteHeader } from "@/components/shared/site-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function MentorsLoading() {
  return (
    <>
      <SiteHeader />
      <main className="container pb-20 pt-10" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading mentors</span>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-9 w-72" />
        <Skeleton className="mt-8 h-12 w-full rounded-lg" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="flex gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div>
              </div>
              <div className="mt-4 flex gap-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
              <Skeleton className="mt-6 h-4 w-full" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
