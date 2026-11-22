export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5 py-2">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
      <span className="sr-only">Loading admin page…</span>
    </div>
  );
}
