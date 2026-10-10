import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import type { Category } from "@prisma/client";

export function Categories({ categories }: { categories: Category[] }) {
  return (
    <section className="container py-20">
      <Reveal className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Categories</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Find your <span className="font-serif-accent">path.</span></h2>
        </div>
      </Reveal>
      <Stagger className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <StaggerItem key={c.id}>
          <Link
            href={`/mentors?category=${c.slug}`}
            className="lift group relative block h-full overflow-hidden rounded-2xl border bg-card p-5"
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-0 transition group-hover:opacity-100"
              style={{ background: `radial-gradient(circle at 100% 0%, ${c.color ?? "#6366F1"}22, transparent 60%)` }}
            />
            <div className="relative">
              <div className="h-8 w-8 rounded-md" style={{ background: `${c.color ?? "#6366F1"}22`, color: c.color ?? "#6366F1" }} />
              <div className="mt-4 text-sm font-medium">{c.name}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</div>
            </div>
          </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
