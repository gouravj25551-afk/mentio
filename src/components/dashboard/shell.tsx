"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  Bell, Bookmark, Calendar, Compass, LayoutDashboard, Settings2,
  Users, LineChart, Shield, Sparkles, Star, Clock, Wallet,
} from "lucide-react";

import { SoundToggle } from "@/components/shared/sound-toggle";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/shared/user-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const studentNav: NavItem[] = [
  { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/student/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/student/saved", label: "Saved mentors", icon: Bookmark },
  { href: "/mentors", label: "Discover", icon: Compass },
  { href: "/dashboard/student/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/student/profile", label: "Profile", icon: Settings2 },
];

const mentorNav: NavItem[] = [
  { href: "/dashboard/mentor", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/mentor/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/mentor/availability", label: "Availability", icon: Clock },
  { href: "/dashboard/mentor/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/mentor/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/mentor/calendars", label: "Calendars", icon: Sparkles },
  { href: "/dashboard/mentor/profile", label: "Profile", icon: Settings2 },
];

const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/mentors", label: "Mentors", icon: Users },
  { href: "/dashboard/admin/users", label: "Users", icon: Shield },
  { href: "/dashboard/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/admin/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/admin/categories", label: "Categories", icon: Compass },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: LineChart },
];

export function DashboardShell({
  user,
  unread,
  children,
}: {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: Role };
  unread: number;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const items = user.role === "ADMIN" ? adminNav : user.role === "MENTOR" ? mentorNav : studentNav;
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const navigating = pendingHref !== null && pendingHref !== path;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-white/10 md:flex md:flex-col">
        <div className="px-4 py-4">
          <Logo />
        </div>
        <div className="px-3">
          <Badge variant="brand" className="w-full justify-center font-mono text-[10px] uppercase tracking-wider">{user.role.toLowerCase()}</Badge>
        </div>
        <nav aria-label="Dashboard" className="mt-5 flex-1 space-y-0.5 px-2">
          {items.map((it) => {
            // The first item is the role's overview: it is only active on its own page.
            const active = path === it.href || (it.href !== items[0].href && path.startsWith(`${it.href}/`));
            return (
              <Link
                key={it.href}
                href={it.href}
                onNavigate={() => setPendingHref(it.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative isolate flex h-9 items-center justify-between rounded-md px-2.5 text-[13px] transition-colors",
                  active ? "text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {active ? (
                  <motion.span layoutId="dash-nav" className="absolute inset-0 -z-10 rounded-md bg-white/[0.08]" transition={{ type: "spring", stiffness: 450, damping: 36 }} />
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <it.icon className="h-3.5 w-3.5" />
                  {it.label}
                </span>
                {it.href.endsWith("notifications") && unread > 0 ? (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-white text-black" : "bg-white/15 text-white")}>{unread}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-muted-foreground">
          <div className="truncate font-medium text-foreground">{user.name ?? user.email}</div>
          <div className="truncate">{user.email}</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 bg-black/70 px-5 backdrop-blur md:px-8">
          <div className="md:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-1.5">
            <SoundToggle />
            <Link href="/dashboard/student/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white">
              <Bell className="h-4 w-4" aria-hidden />
              <span className="sr-only">Notifications</span>
              {unread > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-medium text-black">{unread}</span> : null}
            </Link>
            <UserMenu user={user} />
          </div>
        </header>
        {navigating ? (
          <div role="status" aria-live="polite" className="border-b border-white/10 px-5 py-2 text-xs text-muted-foreground md:px-8">
            Loading {items.find((item) => item.href === pendingHref)?.label ?? "page"}…
          </div>
        ) : null}
        <nav aria-label="Dashboard sections" className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-1.5 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
            // The first item is the role's overview: it is only active on its own page.
            const active = path === it.href || (it.href !== items[0].href && path.startsWith(`${it.href}/`));
            return (
              <Link
                key={it.href}
                href={it.href}
                onNavigate={() => setPendingHref(it.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors",
                  active ? "bg-white/[0.1] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <it.icon className="h-3.5 w-3.5" aria-hidden />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <main id="main-content" tabIndex={-1} className="px-5 py-6 outline-none md:px-8">{children}</main>
      </div>
    </div>
  );
}
