import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const items = [
  { name: "Nikita B.", role: "GSoC '24 student", body: "The mentor I booked helped me scope my proposal in a single call. I made the shortlist two weeks later." },
  { name: "Ananya S.", role: "SWE intern @ Microsoft", body: "I was stuck on which stack to invest in. One honest conversation changed my entire semester." },
  { name: "Rohit K.", role: "Founder (seed-stage)", body: "Mentio feels like the ADPList I always wanted — fast, no fluff, and the mentors actually ship." },
  { name: "Priyanka D.", role: "Product designer", body: "My portfolio review was more valuable than three Twitter threads combined. Zero fluff." },
  { name: "Yash M.", role: "Open-source maintainer", body: "I mentor students here because the booking flow doesn't waste anybody's time." },
  { name: "Fatima A.", role: "AI engineer", body: "I come back monthly for strategy calls. It's cheaper than therapy and better for my career." },
];

export function Testimonials() {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">What students say</div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Real outcomes, in their words.
        </h2>
      </div>
      <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {items.map((t) => (
          <div key={t.name} className="mb-5 break-inside-avoid rounded-xl border bg-card p-6">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
            </div>
            <p className="mt-3 text-sm leading-relaxed">{t.body}</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar className="h-8 w-8"><AvatarFallback>{initials(t.name)}</AvatarFallback></Avatar>
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
