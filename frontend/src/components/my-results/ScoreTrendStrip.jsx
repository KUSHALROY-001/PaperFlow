import { scorePercent } from "@/hooks/useMyResults";

export default function ScoreTrendStrip({ submittedAttempts }) {
  if (!submittedAttempts || submittedAttempts.length === 0) return null;

  const attempts = [...submittedAttempts].reverse();
  const count = attempts.length;

  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Score Trend</h3>
        {count > 6 && (
          <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
            {count > 12
              ? "Scroll horizontally to view all"
              : "Swipe to view all"}
          </span>
        )}
      </div>

      <div className="overflow-x-auto scrollbar-none sm:scrollbar-thin pb-1">
        <div className="flex items-end gap-2 h-24 min-w-full">
          {attempts.map((a, i) => {
            const pct = scorePercent(a);
            let barColor;
            if (pct >= 80) {
              barColor = "#10B981";
            } else if (pct >= 60) {
              barColor = "#F59E0B";
            } else {
              barColor = "#EF4444";
            }
            return (
              <div
                key={a.id}
                className="flex-1 min-w-[calc((100%-40px)/6)] sm:min-w-[calc((100%-88px)/12)] max-w-20 sm:max-w-25 flex flex-col items-center gap-1 shrink-0"
              >
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">
                  {pct}%
                </span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${(pct / 100) * 56}px`,
                    background: barColor,
                    opacity: 0.85,
                  }}
                />
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap font-medium truncate max-w-full">
                  #{i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
