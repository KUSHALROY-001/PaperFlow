import { useState } from "react";
import { CheckCircle, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import { getOptionText } from "@/utils/mockTestHelpers";
import QuestionContent, { QuestionDiagram } from "../shared/QuestionContent";
import MathText from "../shared/MathText";

export default function QuestionReviewList({ questions }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!questions || questions.length === 0) return null;

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
        <div className="space-y-2 mt-3">
          {questions.map((q) => {
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
                {q.topic && (
                  <div className="sm:hidden mb-2">
                    <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold inline-block">
                      {q.topic}
                    </span>
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
                      <span className="hidden sm:inline-block text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold shrink-0 mb-1.5">
                        {q.topic}
                      </span>
                    )}

                    <QuestionContent
                      text={q.text}
                      hasCode={q.hasCode}
                      codeLanguage={q.codeLanguage}
                      diagramUrl={q.diagramUrl}
                      placement={q.placement}
                      textClassName="font-bold text-foreground text-xs leading-relaxed"
                    />

                    {!correct && !skipped && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">
                        Your answer:{" "}
                        <span className="font-bold">
                          <MathText
                            text={getOptionText(
                              q.options,
                              q.selectedOptionIndexes[0],
                            )}
                          />
                        </span>
                      </p>
                    )}
                    {!correct && q.correctOptionIndexes?.length > 0 && (
                      <p className="text-xs text-emerald-500 mt-0.5 font-semibold">
                        Correct:{" "}
                        <span className="font-bold">
                          {q.correctOptionIndexes.map((i, idx) => (
                            <span key={i}>
                              {idx > 0 && ", "}
                              <MathText text={getOptionText(q.options, i)} />
                            </span>
                          ))}
                        </span>
                      </p>
                    )}
                    {q.placement === "below_options" && (
                      <div className="mt-2">
                        <QuestionDiagram diagramUrl={q.diagramUrl} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
