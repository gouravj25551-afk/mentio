"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest lets us find the server log line; the message and stack stay out of the page and the log.
    console.error(JSON.stringify({ level: "error", event: "ui.render_failed", digest: error.digest ?? null, errorName: error.name }));
  }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong.</h1>
      <p className="max-w-md text-sm text-muted-foreground">Please try again. If it keeps happening, come back in a little while.</p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="brand">Try again</Button>
        <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
      </div>
      {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
    </main>
  );
}
