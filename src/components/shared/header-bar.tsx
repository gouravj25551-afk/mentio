"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/shared/user-menu";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/mentors", label: "Mentors" },
  { href: "/categories", label: "Categories" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

type HeaderUser = { name?: string | null; email?: string | null; image?: string | null; role: Role } | null;

/** Floating glass nav that tightens on scroll, with a sliding active-link pill. */
export function HeaderBar({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  const active = LINKS.find((l) => !l.href.includes("#") && pathname.startsWith(l.href))?.href ?? null;
  const pill = hovered ?? active;

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-5">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className={cn(
          "mx-auto flex h-14 max-w-[1200px] items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-4",
          scrolled
            ? "border-white/10 bg-[#0a0d1f]/75 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="flex items-center gap-4">
          <Logo />
          <nav aria-label="Main" className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
                aria-current={active === l.href ? "page" : undefined}
                className={cn(
                  "relative isolate rounded-full px-3.5 py-2 text-sm transition-colors",
                  active === l.href ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {pill === l.href ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-white/[0.07] ring-1 ring-white/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                ) : null}
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="md:hidden">
            <Link href="/mentors">Mentors</Link>
          </Button>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="brand" size="sm" className="shine rounded-full px-4">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </header>
  );
}
