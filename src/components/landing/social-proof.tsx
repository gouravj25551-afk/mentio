export function SocialProof() {
  const logos = ["Google", "Microsoft", "Stripe", "Vercel", "Anthropic", "Figma", "Linear", "GSoC"];
  return (
    <section className="border-y bg-muted/20 py-10">
      <div className="container">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Our mentors ship at
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map((logo) => (
            <span key={logo} className="font-display text-lg font-semibold text-muted-foreground/70">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
