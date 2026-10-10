import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-2 rounded-md font-display text-lg font-semibold tracking-tight", className)}>
      <span className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg brand-gradient text-white shadow-soft">
        <span className="relative text-[13px] font-black">M</span>
      </span>
      <span>Mentio</span>
    </Link>
  );
}
