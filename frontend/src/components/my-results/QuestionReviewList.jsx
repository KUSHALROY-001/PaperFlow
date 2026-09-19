import { useMemo, useState } from "react";
import { CheckCircle, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import QuestionContent, {
  QuestionExplanation,
} from "../shared/QuestionContent";
import QuestionAnswerReview, {
  getAnswerOutcome,
  isQuestionSkipped,
} from "../shared/QuestionAnswerReview";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

function resolveQuestionMarks(
  question,
  defaultMarksPerCorrect,
  defaultNegative,
) {
  const max =
    question.marksPerCorrect != null &&
    Number.isFinite(Number(question.marksPerCorrect))
      ? Number(question.marksPerCorrect)
      : defaultMarksPerCorrect != null &&
          Number.isFinite(Number(defaultMarksPerCorrect))
        ? Number(defaultMarksPerCorrect)
        : null;
  const neg =
    question.negativeMarksPerWrong != null &&
    Number.isFinite(Number(question.negativeMarksPerWrong))
      ? Number(question.negativeMarksPerWrong)
      : defaultNegative != null && Number.isFinite(Number(defaultNegative))
        ? Number(defaultNegative)
        : null;
  return { maxMarks: max, negativeMarks: neg };
}

function MarksBadge({ question, defaultMarksPerCorrect, defaultNegative }) {
  const awarded =
    question.marksAwarded !== null && question.marksAwarded !== undefined
      ? Number(question.marksAwarded)
      : null;
  if (awarded === null || Number.isNaN(awarded)) return null;

  const { maxMarks, negativeMarks } = resolveQuestionMarks(
    question,
    defaultMarksPerCorrect,
    defaultNegative,
  );
  const skipped = isQuestionSkipped(question);

  let badgeClass;
  if (awarded > 0) {
    badgeClass =
      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  } else if (awarded < 0) {
    badgeClass =
      "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  } else {
    badgeClass = "text-muted-foreground bg-muted border-border";
  }

  const awardedLabel = awarded > 0 ? `+${awarded}` : `${awarded}`;
  let detail = null;
  if (!skipped && maxMarks != null) {
    detail = ` / ${maxMarks}`;
  }
  let negHint = null;
  if (!skipped && awarded < 0 && negativeMarks != null && negativeMarks > 0) {
    negHint = ` (-${negativeMarks} wrong)`;
  }

  return (
    <span
      className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full border ${badgeClass}`}
    >
      {awardedLabel}
      {detail} marks
      {negHint}
    </span>
  );
}

export default function QuestionReviewList({
  questions,
  defaultMarksPerCorrect = null,
  defaultNegativeMarksPerWrong = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  if (!questions || questions.length === 0) return null;

  const { wrongQuestions, untouchedQuestions } = useMemo(() => {
    const wrong = [];
    const untouched = [];
    for (const q of questions) {
      const outcome = getAnswerOutcome(q);
      if (outcome === "skipped") untouched.push(q);
      else if (outcome === "wrong") wrong.push(q);
    }
    return { wrongQuestions: wrong, untouchedQuestions: untouched };
  }, [questions]);

  const filters = [
    { id: "all", label: "All", count: questions.length },
    { id: "wrong", label: "Wrong", count: wrongQuestions.length },
    { id: "untouched", label: "Untouched", count: untouchedQuestions.length },
  ];

  let visibleQuestions;
  if (activeFilter === "wrong") {
    visibleQuestions = wrongQuestions;
  } else if (activeFilter === "untouched") {
    visibleQuestions = untouchedQuestions;
  } else {
    visibleQuestions = questions;
  }

  return (
    <div className="border border-border/60 rounded-md p-3 sm:p-4 bg-card/50">
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
                const outcome = getAnswerOutcome(q);

                let cardClass;
                let statusIcon;
                if (outcome === "positive") {
                  cardClass = "bg-emerald-500/10 border-emerald-500/30";
                  statusIcon = (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  );
                } else if (outcome === "skipped") {
                  cardClass = "bg-card border-border";
                  statusIcon = (
                    <span className="w-4 h-4 rounded-full border-2 border-muted-foreground block" />
                  );
                } else {
                  cardClass = "bg-red-500/10 border-red-500/30";
                  statusIcon = <XCircle className="w-4 h-4 text-red-500" />;
                }

                return (
                  <div
                    key={q.questionId}
                    className={`p-3.5 rounded-xl border text-sm ${cardClass}`}
                  >
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
                      <div className="hidden sm:block shrink-0 mt-0.5">
                        {statusIcon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {q.topic && (
                            <span className="hidden sm:inline-block text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-lg font-bold">
                              {q.topic}
                            </span>
                          )}
                          {q.subtopic && (
                            <span className="hidden sm:inline-block text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg font-bold">
                              {q.subtopic}
                            </span>
                          )}
                          <MarksBadge
                            question={q}
                            defaultMarksPerCorrect={defaultMarksPerCorrect}
                            defaultNegative={defaultNegativeMarksPerWrong}
                          />
                        </div>

                        <DiagramAssetsProvider assets={q.diagramAssets}>
                          <QuestionContent
                            text={q.text}
                            passage={q.passage}
                            textClassName="font-bold text-foreground text-xs leading-relaxed"
                          />
                          <QuestionAnswerReview question={q} />
                          <QuestionExplanation explanation={q.explanation} />
                        </DiagramAssetsProvider>
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
