"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ease } from "@/components/motion/primitives";

export function CTA() {
  return (
    <section className="container pb-24 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.8, ease }}
        className="ring-animated relative rounded-[2rem]"
      >
        <div className="noise relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0e24] px-6 py-16 text-center sm:px-12 md:py-24">
          <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(262_90%_62%/0.55),transparent)] blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,hsl(190_95%_55%/0.35),transparent)] blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Stop sending <span className="text-gradient-animated">cold DMs.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/65 md:text-lg">
              The person who can unblock you is one call away. Booking takes under a minute.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" className="shine rounded-full bg-white text-[#0b0e24] hover:bg-white/90">
                <Link href="/mentors">Find your mentor <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="rounded-full border-white/20 bg-white/0 text-white hover:bg-white/10">
                <Link href="/sign-up?role=MENTOR">Become a mentor</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
