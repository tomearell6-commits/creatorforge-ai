/** Shown instantly while any admin page is opening. */
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-muted/50" />
        ))}
      </div>
      <div className="h-48 rounded-xl border border-border bg-muted/50" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
