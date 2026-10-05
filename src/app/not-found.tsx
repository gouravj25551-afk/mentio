import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="font-display text-7xl font-semibold brand-text">404</div>
      <p className="max-w-sm text-sm text-muted-foreground">The page you&apos;re looking for has moved or never existed.</p>
      <div className="flex gap-2">
        <Button asChild variant="brand"><Link href="/">Back to home</Link></Button>
        <Button asChild variant="outline"><Link href="/mentors">Browse mentors</Link></Button>
      </div>
    </main>
  );
}
