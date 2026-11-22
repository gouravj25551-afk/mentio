import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main-content" className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-[13px] text-muted-foreground">The page you&apos;re looking for has moved or never existed.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="brand"><Link href="/">Back to home</Link></Button>
        <Button asChild variant="outline"><Link href="/mentors">Browse mentors</Link></Button>
      </div>
    </main>
  );
}
