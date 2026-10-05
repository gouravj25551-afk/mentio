import { ShieldCheck, Zap, HeartHandshake } from "lucide-react";

export function Benefits() {
  const items = [
    { icon: ShieldCheck, title: "Vetted mentors only", desc: "Every mentor application is reviewed by a person before the profile goes live." },
    { icon: Zap, title: "Book in 30 seconds", desc: "Pick a slot and confirm. You get an email, and can cancel from your dashboard." },
    { icon: HeartHandshake, title: "Free in early access", desc: "Sessions are free while we get started. Paid sessions may come later." },
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
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
