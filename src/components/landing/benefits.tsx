import { ShieldCheck, Zap, Globe2, HeartHandshake } from "lucide-react";

export function Benefits() {
  const items = [
    { icon: ShieldCheck, title: "Vetted mentors only", desc: "Every mentor profile is reviewed by an admin before it goes live. Ratings come only from completed sessions." },
    { icon: Zap, title: "Book in a minute", desc: "No request-and-wait. Pick a slot and confirm. Reschedule or cancel from your dashboard." },
    { icon: Globe2, title: "Timezone-aware", desc: "Mentors set hours in their own timezone. You see every time in yours." },
    { icon: HeartHandshake, title: "Free during the beta", desc: "Every session is free while we build. Paid sessions will only launch once payments are fully in place." },
  ];
  return (
    <section className="border-y bg-muted/20 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Why Mentio</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Built for the people who build.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.title} className="rounded-xl border bg-card p-6">
              <it.icon className="h-5 w-5 text-indigo-500" />
              <h3 className="mt-4 font-medium">{it.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
