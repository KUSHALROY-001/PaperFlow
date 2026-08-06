import { Clock } from "lucide-react";
import { formatDuration } from "@/lib/date";

export default function SharedMockHeader({
  mockTestName,
  name,
  answeredCount,
  totalQuestions,
  timeLeft,
  submitting,
  handleSubmit,
}) {
  return (
    <header className="min-h-14 bg-card/80 backdrop-blur-md border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center px-4 sm:px-6 py-3 sticky top-0 z-20">
      <div className="flex-1">
        <div className="text-sm font-bold text-foreground">
          {mockTestName}
        </div>
        <div className="text-xs text-muted-foreground">
          {name} · {answeredCount}/{totalQuestions} answered
        </div>
      </div>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${timeLeft < 120 ? "bg-red-500/15 text-red-500 border border-red-500/20" : "bg-orange-500/15 text-orange-500 border border-orange-500/20"}`}
      >
        <Clock className="w-4 h-4" /> {formatDuration(timeLeft)}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </header>
  );
}
