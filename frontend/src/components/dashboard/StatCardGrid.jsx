import { Skeleton } from "@/components/ui/skeleton";

// Extracted from pages/Dashboard.jsx — no behavior changes.

function SparklineWave({ color = "#ea580c" }) {
  return (
    <svg className="w-10 sm:w-16 h-5 sm:h-8 shrink-0 overflow-visible" viewBox="0 0 100 40" fill="none">
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

export default function StatCardGrid({ statCards, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="surface-card rounded-2xl p-3 sm:p-5 border border-border flex flex-col justify-between"
          >
            <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl" />
            <div className="mt-3 sm:mt-4 flex items-end justify-between gap-1">
              <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-6 sm:h-7 w-10 sm:w-12" />
                <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20" />
                <Skeleton className="h-2 sm:h-2.5 w-20 sm:w-24" />
              </div>
              <Skeleton className="w-10 sm:w-16 h-5 sm:h-8 rounded shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {statCards.map((card) => (
        <div
          key={card.label}
          className="surface-card rounded-2xl p-3 sm:p-5 border border-border flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}
            >
              <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex items-end justify-between gap-1">
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                {card.value}
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-foreground mt-0.5 sm:mt-1 truncate">
                {card.label}
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
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
