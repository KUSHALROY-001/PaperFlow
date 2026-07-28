// Extracted from pages/Dashboard.jsx — no behavior changes.

function SparklineWave({ color = "#ea580c" }) {
  return (
    <svg className="w-16 h-8 overflow-visible" viewBox="0 0 100 40" fill="none">
      <path
        d="M0 32 Q 25 38, 45 20 T 90 12 T 100 18"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function StatCardGrid({ statCards }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <div
          key={card.label}
          className="surface-card rounded-2xl p-4 sm:p-5 border border-border flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div
              className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}
            >
              <card.icon className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {card.value}
              </div>
              <div className="text-xs font-bold text-foreground mt-1">
                {card.label}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {card.subtext}
              </div>
            </div>
            <SparklineWave color={card.waveColor} />
          </div>
        </div>
      ))}
    </div>
  );
}
