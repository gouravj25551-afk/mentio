import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="container pb-24">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 p-10 text-white md:p-16">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/10 blur-3xl" aria-hidden />
        <div className="relative max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">
            Learn from someone who has done it.
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">
            Mentio is in early access. Browse our first mentors, or apply to become one.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" className="bg-white text-primary hover:bg-white/90">
              <Link href="/mentors">Find your mentor <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="border-white/40 bg-white/0 text-white hover:bg-white/10">
              <Link href="/sign-up?role=MENTOR">Apply to become a mentor</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
