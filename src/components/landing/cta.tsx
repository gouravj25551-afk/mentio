"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/primitives";

export function CTA() {
  return (
    <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-8">
      <FadeIn className="relative overflow-hidden rounded-xl border border-white/10 px-6 py-16 text-center md:py-20">
        <div className="dots-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">Stop sending cold DMs.</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">The person who can unblock you is one call away. Booking takes under a minute.</p>
          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button asChild size="xl" variant="brand"><Link href="/mentors">Find your mentor <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></Button>
            <Button asChild size="xl" variant="outline"><Link href="/sign-up?role=MENTOR">Become a mentor</Link></Button>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
