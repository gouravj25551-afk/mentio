"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CategoryOption = { id: string; slug: string; name: string; icon: string | null; color: string | null; mentorCount?: number };
type SkillOption = { id: string; slug: string; name: string };

export function DiscoveryFilters({ categories, skills }: { categories: CategoryOption[]; skills: SkillOption[]; initial?: Record<string, string | undefined> }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = useCallback(
    (patch: Record<string, string | undefined>) => {
      const url = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (!v) url.delete(k);
        else url.set(k, v);
      }
      url.delete("page");
      startTransition(() => router.push(`/mentors${url.toString() ? `?${url.toString()}` : ""}`, { scroll: false }));
    },
    [router, params],
  );

  const activeCat = params.get("category") ?? "";
  const activeSkill = params.get("skill") ?? "";
  const activeSort = params.get("sort") ?? "recommended";
  const skillOptions = useMemo(() => skills.slice(0, 60), [skills]);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          push({ q: String(fd.get("q") ?? "") });
        }}
        className="relative w-full max-w-xl"
      >
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          aria-label="Search mentors"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search by name, company, or what they help with"
          className="h-10 pl-9 pr-20"
        />
        <Button type="submit" size="sm" variant="brand" className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 px-3">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          Search
        </Button>
      </form>

      <div
        className="-mx-5 flex items-center gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        <Chip label="All" active={!activeCat} onClick={() => push({ category: undefined })} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} count={c.mentorCount} active={activeCat === c.slug} onClick={() => push({ category: c.slug })} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={activeSkill || "any"} onValueChange={(v) => push({ skill: v === "any" ? undefined : v })}>
          <SelectTrigger aria-label="Filter by skill" className="h-8 w-40 text-xs"><SelectValue placeholder="Any skill" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any skill</SelectItem>
            {skillOptions.map((s) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeSort} onValueChange={(v) => push({ sort: v })}>
          <SelectTrigger aria-label="Sort mentors" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Recommended</SelectItem>
            <SelectItem value="rating">Top rated</SelectItem>
            <SelectItem value="sessions">Most booked</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative isolate inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs transition-colors",
        active ? "border-transparent text-black" : "border-white/12 text-white/65 hover:border-white/40 hover:text-white",
      )}
    >
      {active ? <motion.span layoutId="category-chip" className="absolute inset-0 -z-10 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
      {label}
      {count !== undefined ? <span className={cn("font-mono text-[10px]", active ? "text-black/55" : "text-white/35")}>{count}</span> : null}
    </button>
  );
}
