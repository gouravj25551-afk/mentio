"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Bookmark, Calendar, Compass, LayoutDashboard, Settings2,
  Users, LineChart, Shield, Sparkles, Star, Clock,
} from "lucide-react";

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

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="px-6 py-5">
          <Logo />
        </div>
        <div className="px-3">
          <Badge variant="brand" className="w-full justify-center capitalize">{user.role.toLowerCase()}</Badge>
        </div>
        <nav className="mt-6 flex-1 space-y-0.5 px-2">
          {items.map((it) => {
            const active = path === it.href || path.startsWith(`${it.href}/`);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition",
                  active ? "bg-foreground text-background" : "text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </span>
                {it.href.endsWith("notifications") && unread > 0 ? (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-background text-foreground" : "bg-foreground text-background")}>{unread}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <div className="truncate font-medium text-foreground">{user.name ?? user.email}</div>
          <div className="truncate">{user.email}</div>
        </div>
      </aside>
      <div className="flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-5 backdrop-blur md:px-10">
          <div className="md:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/dashboard/student/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-muted">
              <Bell className="h-4 w-4" />
              {unread > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] text-white">{unread}</span> : null}
            </Link>
            <UserMenu user={user} />
          </div>
        </header>
        <main className="px-5 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
