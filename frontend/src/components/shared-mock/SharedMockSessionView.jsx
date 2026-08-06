import { Flag, ChevronLeft, ChevronRight } from "lucide-react";

export default function SharedMockSessionView({
  q,
  current,
  totalQuestions,
  questions,
  selected,
  flagged,
  answers,
  toggleFlag,
  handleAnswer,
  setCurrent,
}) {
  if (!q) return null;

  return (
    <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
      <div className="surface-card rounded-3xl p-5 sm:p-6 border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <span className="text-xs font-bold text-orange-500 bg-orange-500/15 border border-orange-500/20 px-3 py-1 rounded-full">
            Q{current + 1} of {totalQuestions}
          </span>
          <button
            onClick={toggleFlag}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
              flagged.has(q.questionId)
                ? "bg-amber-500/15 text-amber-500 border-amber-500/20"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Flag
          </button>
        </div>
        <p className="text-base font-bold text-foreground mb-6 leading-relaxed">
          {q.text}
        </p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all ${
                selected === i
                  ? "border-orange-500 bg-orange-500/10 text-orange-500 font-bold"
                  : "border-border bg-card hover:border-orange-500/40 text-foreground"
              }`}
            >
              <span className="font-bold text-orange-500 mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          ))}
        </div>

        {/* Question dots */}
        <div className="flex gap-1.5 flex-wrap mt-6 pt-5 border-t border-border">
          {questions.map((question, i) => (
            <button
              key={question.questionId}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                i === current
                  ? "bg-[#ea580c] text-white"
                  : answers[question.questionId]?.selected.length
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground font-bold rounded-xl text-xs sm:text-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() =>
              setCurrent((c) => Math.min(totalQuestions - 1, c + 1))
            }
            disabled={current === totalQuestions - 1}
            className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs disabled:opacity-40 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
