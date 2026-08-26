import { AlertCircle, CheckCircle, FileText, Zap } from "lucide-react";

export default function WorkspaceStatsGrid({
  totalQuestions = 0,
  approvedCount = 0,
  lowConfidence = 0,
  topicsFound = 0,
}) {
  const statsList = [
    {
      label: "Questions Detected",
      value: totalQuestions,
      icon: Zap,
      cardBg:
        "hover:bg-purple-500/10 hover:dark:bg-purple-500/15 border border-purple-500/20",
      iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
      valColor: "text-foreground",
    },
    {
      label: "Approved",
      value: approvedCount,
      icon: CheckCircle,
      cardBg:
        "hover:bg-emerald-500/10 hover:dark:bg-emerald-500/15 border border-emerald-500/20",
      iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      valColor: "text-foreground",
    },
    {
      label: "Low Confidence",
      value: lowConfidence,
      icon: AlertCircle,
      cardBg:
        "hover:bg-amber-500/10 hover:dark:bg-amber-500/15 border border-amber-500/20",
      iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
      valColor: "text-foreground",
    },
    {
      label: "Topics Found",
      value: topicsFound,
      icon: FileText,
      cardBg:
        "hover:bg-blue-500/10 hover:dark:bg-blue-500/15 border border-blue-500/20",
      iconBg: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
      valColor: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
      {statsList.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-md p-1 sm:p-4 flex items-center gap-3 transition-all ${stat.cardBg}`}
        >
          <div
            className={`w-0 h-0 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${stat.iconBg} shrink-0`}
          >
            <stat.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-lg sm:text-xl font-extrabold tracking-tight ${stat.valColor}`}
            >
              {stat.value}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
