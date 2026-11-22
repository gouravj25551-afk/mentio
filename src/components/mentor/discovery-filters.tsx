"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/icons";
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
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          push({ q: String(fd.get("q") ?? "") });
        }}
        className="surface relative mx-auto w-full max-w-2xl rounded-2xl p-1.5"
      >
        <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          aria-label="Search mentors"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search by name, company, or what they help with"
          className="h-12 border-0 bg-transparent pl-10 pr-28 text-base focus-visible:ring-0 sm:text-sm"
        />
        <Button type="submit" size="sm" variant="brand" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-4">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Search
        </Button>
      </form>

      <div
        className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        <Chip label="All" active={!activeCat} onClick={() => push({ category: undefined })} />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            icon={c.icon}
            color={c.color}
            count={c.mentorCount}
            active={activeCat === c.slug}
            onClick={() => push({ category: c.slug })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Select value={activeSkill || "any"} onValueChange={(v) => push({ skill: v === "any" ? undefined : v })}>
          <SelectTrigger aria-label="Filter by skill" className="h-10 w-48 rounded-full border-white/10 bg-white/[0.03]"><SelectValue placeholder="Any skill" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any skill</SelectItem>
            {skillOptions.map((s) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeSort} onValueChange={(v) => push({ sort: v })}>
          <SelectTrigger aria-label="Sort mentors" className="h-10 w-44 rounded-full border-white/10 bg-white/[0.03]"><SelectValue /></SelectTrigger>
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

function Chip({ label, active, onClick, icon, color, count }: { label: string; active: boolean; onClick: () => void; icon?: string | null; color?: string | null; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative isolate inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors",
        active ? "border-transparent text-white" : "border-white/10 bg-white/[0.02] text-white/65 hover:border-white/25 hover:text-white",
      )}
    >
      {active ? (
        <motion.span
          layoutId="category-chip"
          className="absolute inset-0 -z-10 rounded-full"
          style={{ background: `linear-gradient(120deg, ${color ?? "#8b5cf6"}, #4f46e5)` }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      ) : null}
      {icon !== undefined ? <CategoryIcon name={icon} className="h-3.5 w-3.5" style={{ color: active ? "#fff" : color ?? undefined }} /> : null}
      {label}
      {count !== undefined ? <span className={cn("text-[11px]", active ? "text-white/80" : "text-white/35")}>{count}</span> : null}
    </button>
  );
}
