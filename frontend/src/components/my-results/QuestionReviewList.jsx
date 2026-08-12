import { useState } from "react";
import { CheckCircle, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import { resolveAssetUrl } from "@/lib/api";
import { getOptionText } from "@/utils/mockTestHelpers";

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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <p className="font-bold text-foreground text-xs leading-relaxed">
                        {q.text}
                      </p>
                      {/* On desktop: Topic badge on right side */}
                      {q.topic && (
                        <span className="hidden sm:inline-block text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold shrink-0">
                          {q.topic}
                        </span>
                      )}
                    </div>

                    {q.diagramUrl && (
                      <img
                        src={resolveAssetUrl(q.diagramUrl)}
                        alt="Question diagram"
                        className="max-w-full rounded-xl border border-border mt-2 mb-2"
                        loading="lazy"
                      />
                    )}

                    {!correct && !skipped && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">
                        Your answer:{" "}
                        <span className="font-bold">
                          {getOptionText(
                            q.options,
                            q.selectedOptionIndexes[0],
                          )}
                        </span>
                      </p>
                    )}
                    {!correct && q.correctOptionIndexes?.length > 0 && (
                      <p className="text-xs text-emerald-500 mt-0.5 font-semibold">
                        Correct:{" "}
                        <span className="font-bold">
                          {q.correctOptionIndexes
                            .map((i) => getOptionText(q.options, i))
                            .join(", ")}
                        </span>
                      </p>
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
