import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1100px] gap-10 px-5 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[13px] leading-6 text-muted-foreground">Book 1:1 calls with people who have done what you want to do.</p>
        </div>
        {[
          { title: "Product", links: [["Browse mentors", "/mentors"], ["Categories", "/categories"]] },
          { title: "For mentors", links: [["Become a mentor", "/sign-up?role=MENTOR"], ["Mentor dashboard", "/dashboard/mentor"]] },
        ].map((col) => (
          <div key={col.title}>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{col.title}</div>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {col.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="text-white/75 transition-colors hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Mentio</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
