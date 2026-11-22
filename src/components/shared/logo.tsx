import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-9 items-center gap-2 rounded-md font-display text-[15px] font-semibold tracking-tight", className)}>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-white text-[11px] font-black text-black">M</span>
      <span>Mentio</span>
    </Link>
  );
}
