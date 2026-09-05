// Promoted from an inline function inside pages/MockTestWorkspace.jsx — no behavior changes.

export default function PhaseWaterCard({
  phaseTitle,
  status,
  substep,
  icon: Icon,
  fillLevel,
  fillTone,
}) {
  const waveColor =
    fillTone === "emerald" ? "text-emerald-500/40" : "text-orange-500/40";

  let gradientClass;
  let iconBg;
  let statusColor;
  switch (fillTone) {
    case "emerald":
      gradientClass =
        "from-emerald-500/20 via-emerald-500/10 to-transparent border-t border-emerald-500/30";
      iconBg = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
      statusColor = "text-emerald-600 dark:text-emerald-400";
      break;
    case "orange":
      gradientClass =
        "from-orange-500/20 via-orange-500/10 to-transparent border-t border-orange-500/30";
      iconBg = "bg-orange-500/20 text-orange-600 dark:text-orange-400";
      statusColor = "text-orange-600 dark:text-orange-400";
      break;
    default:
      gradientClass = "from-muted/40 to-muted/10";
      iconBg = "bg-muted text-muted-foreground";
      statusColor = "text-muted-foreground";
      break;
  }

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border surface-card p-3 transition-all sm:p-4">
      {/* Animated Liquid Water Fill Layer */}
      {fillLevel > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradientClass} transition-all duration-1000 ease-out pointer-events-none`}
          style={{ height: `${Math.min(fillLevel, 100)}%` }}
        >
          {/* Animated Liquid Wave Crest */}
          {fillLevel < 100 && (
            <div className="absolute -top-3 left-0 w-[200%] h-4 overflow-hidden opacity-80">
              <svg
                className="w-full h-full animate-liquid-wave"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,0 C150,90 350,-40 500,40 C650,120 900,-20 1200,40 L1200,120 L0,120 Z"
                  fill="currentColor"
                  className={waveColor}
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} shrink-0 shadow-xs`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground text-sm truncate">
            {phaseTitle}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {substep}
          </div>
        </div>
        <span className={`text-xs font-bold ${statusColor} shrink-0`}>
          {status}
        </span>
      </div>
    </div>
  );
}
