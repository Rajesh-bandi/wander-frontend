export function SkeletonCard({ height = 220 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="animate-pulse bg-muted" style={{ height }} />
      <div className="space-y-2 p-4">
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
