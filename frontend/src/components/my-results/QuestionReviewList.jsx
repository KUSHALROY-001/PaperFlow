import { useMemo, useState } from "react";
import { CheckCircle, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import QuestionContent, {
  QuestionDiagram,
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";

export default function QuestionReviewList({ questions }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  if (!questions || questions.length === 0) return null;

  // Computed once per questions/filter change rather than inline in the
  // render below - counts feed the filter pill labels below AND the
  // filtered list itself, so this stays the single source of truth for
  // both rather than two separate .filter() passes that could drift.
  const { wrongQuestions, untouchedQuestions } = useMemo(() => {
    const wrong = [];
    const untouched = [];
    for (const q of questions) {
      const skipped = q.selectedOptionIndexes.length === 0;
      if (skipped) untouched.push(q);
      else if (q.isCorrect !== true) wrong.push(q);
    }
    return { wrongQuestions: wrong, untouchedQuestions: untouched };
  }, [questions]);

  const filters = [
    { id: "all", label: "All", count: questions.length },
    { id: "wrong", label: "Wrong", count: wrongQuestions.length },
    { id: "untouched", label: "Untouched", count: untouchedQuestions.length },
  ];

  const visibleQuestions =
    activeFilter === "wrong"
      ? wrongQuestions
      : activeFilter === "untouched"
        ? untouchedQuestions
        : questions;

  return (
    <div className="border border-border/60 rounded-2xl p-3 sm:p-4 bg-card/50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left focus:outline-none group"
      >
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors flex items-center gap-1.5">
          Question Review ({questions.length})
        </h4>
        <div className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-orange-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#ea580c] text-white shadow-xs"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              );
            })}
          </div>

          {visibleQuestions.length === 0 ? (
            <div className="mt-3 rounded-xl border border-border bg-card px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
              {activeFilter === "wrong"
                ? "No wrong answers - nice work."
                : "Nothing left untouched - every question was answered."}
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              {visibleQuestions.map((q) => {
                const correct = q.isCorrect === true;
                const skipped = q.selectedOptionIndexes.length === 0;
                return (
                  <div
                    key={q.questionId}
                    className={`p-3.5 rounded-xl border text-sm ${
                      correct
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : skipped
                          ? "bg-card border-border"
                          : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    {/* On mobile only: Topic badge on top of card */}
                    {(q.topic || q.subtopic) && (
                      <div className="sm:hidden mb-2 flex flex-wrap gap-1.5">
                        {q.topic && (
                          <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold inline-block">
                            {q.topic}
                          </span>
                        )}
                        {q.subtopic && (
                          <span className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg font-bold inline-block">
                            {q.subtopic}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      {/* Circle before question: hidden on mobile, visible on desktop */}
                      <div className="hidden sm:block shrink-0 mt-0.5">
                        {correct ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : skipped ? (
                          <span className="w-4 h-4 rounded-full border-2 border-muted-foreground block" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* On desktop: Topic badge on its own line above the
                          question, same layout ReviewTab.jsx uses - keeps
                          QuestionContent's code block/diagram full-width
                          instead of squeezed into a flex row beside it. */}
                        {q.topic && (
                          <span className="hidden sm:inline-block text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold shrink-0 mb-1.5 mr-1.5">
                            {q.topic}
                          </span>
                        )}
                        {q.subtopic && (
                          <span className="hidden sm:inline-block text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg font-bold shrink-0 mb-1.5">
                            {q.subtopic}
                          </span>
                        )}

                        <QuestionContent
                          text={q.text}
                          passage={q.passage}
                          diagramUrl={q.diagramUrl}
                          placement={q.placement}
                          textClassName="font-bold text-foreground text-xs leading-relaxed"
                        />

                        {/* Every option shown, not just a "Your answer"/"Correct"
                          text summary - the correct option always gets a
                          green tick + label, and whichever option the user
                          actually picked gets a red cross if it was wrong
                          (nothing is marked wrong if they skipped the
                          question entirely). */}
                        <div className="mt-2 space-y-1.5">
                          {q.options.map((option, optionIndex) => {
                            const normalizedOption =
                              typeof option === "string"
                                ? { optionIndex, optionText: option }
                                : option;
                            const isCorrect = q.correctOptionIndexes?.includes(
                              normalizedOption.optionIndex,
                            );
                            const isYourWrongPick =
                              !skipped &&
                              !correct &&
                              q.selectedOptionIndexes.includes(
                                normalizedOption.optionIndex,
                              );

                            return (
                              <div
                                key={normalizedOption.optionIndex}
                                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                                  isCorrect
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                    : isYourWrongPick
                                      ? "bg-red-500/10 border-red-500/30 text-red-600"
                                      : "bg-card border-border text-muted-foreground"
                                }`}
                              >
                                <span className="flex-1 whitespace-pre-wrap">
                                  <MathText text={normalizedOption.optionText} />
                                </span>
                                {isCorrect && (
                                  <span className="inline-flex items-center gap-1 font-bold shrink-0">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Correct
                                  </span>
                                )}
                                {isYourWrongPick && (
                                  <span className="inline-flex items-center gap-1 font-bold shrink-0">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Your answer
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {q.placement === "below_options" && (
                          <div className="mt-2">
                            <QuestionDiagram diagramUrl={q.diagramUrl} />
                          </div>
                        )}
                        <QuestionExplanation explanation={q.explanation} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
