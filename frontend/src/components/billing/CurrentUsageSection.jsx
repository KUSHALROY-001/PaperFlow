import { CheckCircle, Zap, FileText } from "lucide-react";

export default function CurrentUsageSection({ usage }) {
  const usageItems = [
    {
      label: "Clusters Used",
      used: usage.clusters,
      limit: 50,
      unit: "clusters",
      icon: FileText,
      color: "#ea580c",
    },
    {
      label: "Pages Processed",
      used: usage.pages,
      limit: 25000,
      unit: "pages",
      icon: Zap,
      color: "#f59e0b",
    },
    {
      label: "Questions Extracted",
      used: usage.questions,
      limit: null,
      unit: "total",
      icon: CheckCircle,
      color: "#10B981",
    },
  ];

  return (
    <div className="surface-card rounded-2xl p-6 border border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h2 className="font-bold text-foreground">Current Usage</h2>
          <p className="text-xs text-muted-foreground">
            Pro Plan · Resets Jun 1, 2026
          </p>
        </div>
        <span className="text-xs bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" /> Pro Plan Active
        </span>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {usageItems.map((u, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <span className="font-bold text-foreground">{u.label}</span>
              <span className="text-muted-foreground font-semibold">
                {u.used.toLocaleString()}
                {u.limit ? ` / ${u.limit.toLocaleString()}` : ""}
              </span>
            </div>
            {u.limit ? (
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((u.used / u.limit) * 100, 100)}%`,
                    background: u.color,
                  }}
                />
              </div>
            ) : (
              <div className="h-2.5 bg-emerald-500/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: "100%" }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {u.limit
                ? `${Math.round((u.used / u.limit) * 100)}% used`
                : "Unlimited"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
