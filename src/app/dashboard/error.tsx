"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Keeps the dashboard shell (sidebar, header) on screen when one page fails.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", event: "ui.dashboard_render_failed", digest: error.digest ?? null, errorName: error.name }));
  }, [error]);
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
      <h2 className="font-display text-xl font-semibold">This page couldn&apos;t load.</h2>
      <p className="max-w-md text-sm text-muted-foreground">Your data is safe. Try again, or head back to your dashboard.</p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="brand">Try again</Button>
        <Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
      </div>
      {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
    </div>
  );
}
