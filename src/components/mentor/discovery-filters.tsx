"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { Category, Skill } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function DiscoveryFilters({
  categories,
  skills,
}: {
  categories: Category[];
  skills: Skill[];
  initial: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const push = useCallback(
    (patch: Record<string, string | undefined>) => {
      const url = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (!v) url.delete(k);
        else url.set(k, v);
      }
      url.delete("page");
      router.push(`/mentors${url.toString() ? `?${url.toString()}` : ""}`);
    },
    [router, params]
  );

  const activeCat = params.get("category") ?? "";
  const activeSkill = params.get("skill") ?? "";
  const activeSort = params.get("sort") ?? "recommended";

  const skillOptions = useMemo(() => skills.slice(0, 60), [skills]);

  return (
    <div className="mt-8 flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          push({ q: String(fd.get("q") ?? "") });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={params.get("q") ?? ""} placeholder="Search mentors by name, headline, or skill" className="h-12 pl-10 pr-28" />
        <Button type="submit" size="sm" variant="brand" className="absolute right-2 top-1/2 -translate-y-1/2">Search</Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
        <Chip label="All" active={!activeCat} onClick={() => push({ category: undefined })} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} active={activeCat === c.slug} onClick={() => push({ category: c.slug })} />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Select value={activeSkill} onValueChange={(v) => push({ skill: v || undefined })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Any skill" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any skill</SelectItem>
              {skillOptions.map((s) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeSort} onValueChange={(v) => push({ sort: v })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="sessions">Most booked</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "whitespace-nowrap rounded-full border px-3 py-1 text-xs transition " +
        (active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted")
      }
    >
      {label}
    </button>
  );
}
