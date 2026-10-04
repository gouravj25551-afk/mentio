import { Logo } from "@/components/shared/logo";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex animate-pulse items-center gap-3">
        <Logo />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    </div>
  );
}
