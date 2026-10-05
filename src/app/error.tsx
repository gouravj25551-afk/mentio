"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <div className="font-display text-3xl font-semibold">Something went wrong.</div>
      <p className="max-w-md text-sm text-muted-foreground">Please try again. If it keeps happening, come back in a little while.</p>
      <Button onClick={reset} variant="brand">Try again</Button>
    </main>
  );
}
