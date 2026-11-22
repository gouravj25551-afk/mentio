"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { SoundToggle } from "@/components/shared/sound-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/mentors", label: "Mentors" },
  { href: "/categories", label: "Categories" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

type HeaderUser = { name?: string | null; email?: string | null; image?: string | null; role: Role } | null;

/** Plain top bar that gains a hairline and blur once you scroll. */
export function HeaderBar({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  const active = LINKS.find((l) => !l.href.includes("#") && pathname.startsWith(l.href))?.href ?? null;
  const underline = hovered ?? active;

  return (
    <header className={cn("sticky top-0 z-40 w-full transition-colors duration-200", scrolled ? "border-b border-white/10 bg-black/70 backdrop-blur-xl" : "border-b border-transparent")}>
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-5">
        <div className="flex items-center gap-7">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-5 md:flex" onMouseLeave={() => setHovered(null)}>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
                aria-current={active === l.href ? "page" : undefined}
                className={cn("relative py-1 text-[13px] transition-colors", active === l.href || hovered === l.href ? "text-white" : "text-muted-foreground")}
              >
                {l.label}
                {underline === l.href ? <motion.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-0.5 h-px bg-white" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <SoundToggle />
          <Button asChild variant="ghost" size="sm" className="md:hidden"><Link href="/mentors">Mentors</Link></Button>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/sign-in">Sign in</Link></Button>
              <Button asChild variant="brand" size="sm"><Link href="/sign-up">Get started</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
