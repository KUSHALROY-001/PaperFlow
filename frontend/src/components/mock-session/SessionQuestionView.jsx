import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import QuestionContent from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";
import MarksBadge from "@/components/shared/MarksBadge";

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

  let slideClass;
  if (slideDirection === "left") {
    slideClass = "animate-slide-left";
  } else if (slideDirection === "right") {
    slideClass = "animate-slide-right";
  } else {
    slideClass = "";
  }

  return (
    <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full font-sans">
      <div
        key={q.questionId}
        className={`surface-card rounded-md sm:rounded-3xl p-4 sm:p-8 border border-border ${slideClass}`}
      >
        <div className="flex items-start justify-between gap-2.5 sm:gap-4 mb-5 sm:mb-6">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2.5 sm:px-3 py-1 rounded-full shrink-0">
              Q{current + 1} of {totalQuestions}
            </span>
            {q.topic && (
              <span
                className="text-[11px] sm:text-xs text-muted-foreground bg-muted border border-border px-2.5 sm:px-3 py-1 rounded-full font-normal max-w-45 sm:max-w-none truncate"
                title={q.topic}
              >
                {q.topic}
              </span>
            )}
            {q.subtopic && (
              <span
                className="text-[11px] sm:text-xs text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 sm:px-3 py-1 rounded-full font-normal max-w-40 sm:max-w-none truncate"
                title={q.subtopic}
              >
                {q.subtopic}
              </span>
            )}
            {/* Only present when publisher enabled showMarksToStudents */}
            <MarksBadge
              marksPerCorrect={q.marksPerCorrect}
              negativeMarksPerWrong={q.negativeMarksPerWrong}
            />
          </div>
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all shrink-0 ${
              flagged.has(q.questionId)
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />{" "}
            <span>{flagged.has(q.questionId) ? "Flagged" : "Flag"}</span>
          </button>
        </div>

        {/* Wraps the question's text AND its options together, even
            though they're rendered as separate sibling trees below - a
            ![[img:slot_key]] marker inside an option (e.g. a List-I/
            List-II matching question where each option references a
            different image) needs the exact same asset lookup the
            question stem itself uses. See diagramAssetsContext.jsx. */}
        <DiagramAssetsProvider assets={q.diagramAssets}>
          <div className="mb-8">
            <QuestionContent
              text={q.text}
              passage={q.passage}
              textClassName="text-base sm:text-lg font-normal text-foreground leading-relaxed"
            />
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer(i)}
                className={`w-full text-left px-5 py-4 rounded-md border text-sm transition-all ${
                  selected === i
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-500 font-medium shadow-2xs"
                    : "border-border bg-card hover:bg-muted text-foreground font-normal"
                }`}
              >
                <span className="font-semibold text-orange-500 mr-3">
                  {String.fromCodePoint(65 + i)}.
                </span>
                <MathText text={opt} />
              </button>
            ))}
          </div>
        </DiagramAssetsProvider>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={current === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground font-medium rounded-md hover:bg-muted transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <div className="text-xs font-normal text-muted-foreground">
            {progress}% complete
          </div>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={current === totalQuestions - 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium rounded-md shadow-xs transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
