import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Learn from vetted mentors. Mentio is in early access.
          </p>
        </div>
        {[
          { title: "Product", links: [["Browse mentors", "/mentors"], ["Categories", "/categories"]] },
          { title: "For mentors", links: [["Apply to become a mentor", "/sign-up?role=MENTOR"], ["Mentor dashboard", "/dashboard/mentor"]] },
        ].map((col) => (
          <div key={col.title}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.title}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="text-foreground/80 hover:text-foreground">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Mentio. All rights reserved.</span>
          <span>Early access</span>
        </div>
      </div>
    </footer>
  );
}
