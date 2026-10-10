import { Logo } from "@/components/shared/logo";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="animate-pulse motion-reduce:animate-none"><Logo /></div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="shimmer h-full w-full" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
