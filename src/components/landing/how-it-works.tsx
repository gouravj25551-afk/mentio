import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Search, CalendarCheck2, Rocket } from "lucide-react";

export function HowItWorks() {
  const steps = [
    { icon: Search, title: "Discover", desc: "Filter mentors by category or skill and read their profiles." },
    { icon: CalendarCheck2, title: "Book a slot", desc: "Pick a time from the mentor's availability. Sessions are free during early access." },
    { icon: Rocket, title: "Make moves", desc: "Walk away with a plan and clear next steps." },
  ];
  return (
    <section id="how-it-works" className="container py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">How it works</div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Three steps between you and the right <span className="font-serif-accent">conversation.</span>
        </h2>
      </Reveal>
      <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <StaggerItem key={s.title} className="lift hairline relative rounded-2xl border bg-card p-6">
            <div className="absolute -top-3 left-6 inline-flex h-6 w-6 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-white">
              {i + 1}
            </div>
            <s.icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
