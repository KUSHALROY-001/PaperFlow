export default function QueueProgressBar({ position, total, filterSummary }) {
  const safeTotal = total || 0;
  const pct = safeTotal > 0 ? Math.min(100, (position / safeTotal) * 100) : 0;

  return (
    <div className="surface-card rounded-2xl border border-border px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-bold text-foreground">
          {safeTotal > 0 ? `${position} of ${safeTotal}` : "—"}
        </span>
        {filterSummary && (
          <span className="text-xs text-muted-foreground truncate">
            {filterSummary}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[#ea580c] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
