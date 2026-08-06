import { Target, BarChart2, Award, TrendingUp } from "lucide-react";

export default function ResultsSummaryRow({ totalAttempts, avgScore, best }) {
  const summaryItems = [
    {
      label: "Total Attempts",
      value: totalAttempts,
      icon: Target,
      color: "bg-orange-500/15 text-orange-500 border border-orange-500/20",
    },
    {
      label: "Average Score",
      value: `${avgScore}%`,
      icon: BarChart2,
      color: "bg-blue-500/15 text-blue-500 border border-blue-500/20",
    },
    {
      label: "Best Score",
      value: `${best}%`,
      icon: Award,
      color: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
    },
    {
      label: "Trend",
      value: avgScore >= 70 ? "↑ Improving" : "↓ Needs work",
      icon: TrendingUp,
      color:
        avgScore >= 70
          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
          : "bg-amber-500/15 text-amber-500 border border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {summaryItems.map((s) => (
        <div
          key={s.label}
          className="surface-card rounded-2xl p-4 border border-border hover:border-orange-500/30 transition-all"
        >
          <div
            className={`w-8 h-8 rounded-xl ${s.color} flex items-center justify-center mb-2`}
          >
            <s.icon className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-foreground tracking-tight">
            {s.value}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
