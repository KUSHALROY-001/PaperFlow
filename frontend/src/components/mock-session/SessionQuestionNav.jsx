import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ConfirmDialog } from "../design-system/ConfirmDialog";

export default function SessionQuestionNav({
  questions,
  current,
  setCurrent,
  answers,
  flagged,
  onSelectQuestion,
  exitHref = "/dashboard",
}) {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);

  const answeredCount = Object.values(answers || {}).filter(
    (a) => a?.selected?.length > 0,
  ).length;
  const flaggedCount = flagged ? flagged.size : 0;
  const notVisitedCount = Math.max(0, questions.length - answeredCount);

  const handleExitClick = (e) => {
    e.preventDefault();
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    navigate(exitHref);
  };

  return (
    <>
      <aside className="w-full lg:w-56 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col p-4 lg:fixed lg:h-full z-10 font-sans">
        <div className="shrink-0 mb-4">
          <Link
            to={exitHref}
            onClick={handleExitClick}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Exit Session
          </Link>
        </div>

        <div className="shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Questions ({questions.length})
        </div>

        {/* Scrollable question buttons grid */}
        <div className="overflow-y-auto scrollbar-hidden flex-1 min-h-0 space-y-2">
          <div className="grid grid-cols-10 lg:grid-cols-5 gap-1.5">
            {questions.map((question, i) => (
              <button
                key={question.questionId}
                onClick={() =>
                  onSelectQuestion ? onSelectQuestion(i) : setCurrent(i)
                }
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center ${
                  i === current
                    ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 font-bold border border-orange-500/30"
                    : answers[question.questionId]?.selected?.length
                      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                      : flagged.has(question.questionId)
                        ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Real Data Legend with Hyphen */}
        <div className="shrink-0 mt-4 pt-3 border-t border-border/60 space-y-2 text-xs font-normal">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50 inline-block" />
              <span className="text-muted-foreground">Answered -</span>
            </div>
            <span className="font-semibold text-foreground font-mono">
              {answeredCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 border border-amber-500/50 inline-block" />
              <span className="text-muted-foreground">Flagged -</span>
            </div>
            <span className="font-semibold text-foreground font-mono">
              {flaggedCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border inline-block" />
              <span className="text-muted-foreground">Not visited -</span>
            </div>
            <span className="font-semibold text-foreground font-mono">
              {notVisitedCount}
            </span>
          </div>
        </div>
      </aside>

      {showExitModal && (
        <ConfirmDialog
          open={showExitModal}
          onOpenChange={(open) => !open && setShowExitModal(false)}
          title="Exit Test Session?"
          description="Are you sure you want to exit this session? Your active test progress will be left."
          confirmLabel="Exit Session"
          warning={true}
          onConfirm={handleConfirmExit}
        />
      )}
    </>
  );
}
