import { Search, CalendarCheck2, Rocket } from "lucide-react";

export function HowItWorks() {
  const steps = [
    { icon: Search, title: "Discover", desc: "Filter mentors by category or skill and read their profiles." },
    { icon: CalendarCheck2, title: "Book a slot", desc: "Pick a time from the mentor's availability. Sessions are free during early access." },
    { icon: Rocket, title: "Make moves", desc: "Walk away with a plan and clear next steps." },
  ];
  return (
    <section id="how-it-works" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">How it works</div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Three steps between you and the right conversation.
        </h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="relative rounded-xl border bg-card p-6">
            <div className="absolute -top-3 left-6 inline-flex h-6 w-6 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-white">
              {i + 1}
            </div>
            <s.icon className="h-6 w-6 text-indigo-500" />
            <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
