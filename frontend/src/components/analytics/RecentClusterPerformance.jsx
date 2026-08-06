import { BarChart2 } from "lucide-react";

export default function RecentClusterPerformance({ recentClusters }) {
  return (
    <div className="surface-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-bold text-foreground">
          Recent Cluster Performance
        </h3>
      </div>
      <div className="divide-y divide-border">
        {recentClusters.map((c, i) => (
          <div key={i} className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 hover:bg-muted/40 transition-colors">
            <div className="w-8 h-8 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {c.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.questions} questions · {c.time} to process
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-bold ${c.confidence >= 90 ? "text-emerald-500" : c.confidence >= 80 ? "text-amber-500" : "text-red-500"}`}
              >
                {c.confidence}%
              </div>
              <div className="text-xs text-muted-foreground font-medium">confidence</div>
            </div>
            <div className="w-full sm:w-24 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${c.confidence}%`,
                  background:
                    c.confidence >= 90
                      ? "#10B981"
                      : c.confidence >= 80
                        ? "#F59E0B"
                        : "#EF4444",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
