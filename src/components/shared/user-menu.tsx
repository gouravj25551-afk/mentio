"use client";
import Link from "next/link";
import { LogOut, LayoutDashboard, UserCircle2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { signOutAction } from "@/features/auth/actions";
import type { Role } from "@prisma/client";

export function UserMenu({ user }: { user: { name?: string | null; email?: string | null; image?: string | null; role: Role } }) {
  const dash =
    user.role === "ADMIN" ? "/dashboard/admin" :
    user.role === "MENTOR" ? "/dashboard/mentor" :
    "/dashboard/student";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full outline-none ring-ring focus-visible:ring-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-foreground">
          <div className="truncate text-sm">{user.name ?? "Account"}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href={dash}><LayoutDashboard className="h-4 w-4" /> Dashboard</Link></DropdownMenuItem>
        {user.role !== "ADMIN" ? (
          <DropdownMenuItem asChild><Link href={`${dash}/profile`}><UserCircle2 className="h-4 w-4" /> Profile</Link></DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAction()}>
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
