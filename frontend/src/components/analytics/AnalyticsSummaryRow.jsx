import { TrendingUp } from "lucide-react";

export default function AnalyticsSummaryRow({ summaryStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {summaryStats.map((s, i) => (
        <div
          key={i}
          className="surface-card rounded-2xl p-4 border border-border hover:border-orange-500/30 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}
            >
              <s.icon className="w-4 h-4" />
            </div>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {s.value}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 font-medium">
            {s.label}
          </div>
          <div className="text-xs text-emerald-500 font-semibold mt-1">
            {s.delta}
          </div>
        </div>
      ))}
    </div>
  );
}
