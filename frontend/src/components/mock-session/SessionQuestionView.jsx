import { Flag, ChevronLeft, ChevronRight } from "lucide-react";

export default function SessionQuestionView({
  q,
  current,
  totalQuestions,
  selected,
  flagged,
  toggleFlag,
  handleAnswer,
  progress,
  slideDirection,
  onNavigateNext,
  onNavigatePrev,
}) {
  if (!q) return null;

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full font-sans">
      <div
        key={q.questionId}
        className={`surface-card rounded-3xl p-5 sm:p-8 border border-border ${
          slideDirection === "left"
            ? "animate-slide-left"
            : slideDirection === "right"
              ? "animate-slide-right"
              : ""
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
              Q{current + 1} of {totalQuestions}
            </span>
            {q.topic && (
              <span className="text-xs text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full font-semibold">
                {q.topic}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              flagged.has(q.questionId)
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />{" "}
            {flagged.has(q.questionId) ? "Flagged" : "Flag"}
          </button>
        </div>

        <p className="text-lg font-bold text-foreground mb-8 leading-relaxed">
          {q.text}
        </p>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAnswer(i)}
              className={`w-full text-left px-5 py-4 rounded-2xl border font-medium text-sm transition-all ${
                selected === i
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-500 font-bold shadow-2xs"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span className="font-bold text-orange-500 mr-3">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={current === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <div className="text-xs font-semibold text-muted-foreground">
            {progress}% complete
          </div>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={current === totalQuestions - 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl shadow-xs transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
