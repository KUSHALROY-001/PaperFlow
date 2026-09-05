import { Clock3 } from "lucide-react";
import { formatDate } from "@/lib/date";

function scorePercent(attempt) {
  if (!attempt.totalQuestions) return 0;
  return Math.round((attempt.correctCount / attempt.totalQuestions) * 100);
}

export default function StudentAttemptRow({ attempt }) {
  const pct = scorePercent(attempt);

  let scoreClass;
  if (pct >= 80) {
    scoreClass = "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20";
  } else if (pct >= 60) {
    scoreClass = "bg-amber-500/15 text-amber-500 border border-amber-500/20";
  } else {
    scoreClass = "bg-red-500/15 text-red-500 border border-red-500/20";
  }

  return (
    <div className="surface-card rounded-2xl border border-border p-4 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${scoreClass}`}
      >
        <span className="text-sm font-black">{pct}%</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
          {attempt.mockTestName}
          {attempt.topics?.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            >
              {topic}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <Clock3 className="w-3.5 h-3.5" />
          {formatDate(attempt.submittedAt)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-foreground">
          {attempt.correctCount}/{attempt.totalQuestions}
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          correct
        </div>
      </div>
    </div>
  );
}
