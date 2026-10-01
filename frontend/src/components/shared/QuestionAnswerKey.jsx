import { CheckCircle2 } from "lucide-react";
import CodeText from "./CodeText";

// One answer-key renderer for both workspace tabs, so supported answer
// types and MCQ correctness cannot drift between Review and Output.
export default function QuestionAnswerKey({ question, compact = false }) {
  const type = question.questionType || "single";
  const correctIndexes = new Set(
    (question.correctOptionIndexes || []).map((index) => Number(index)),
  );
  const shape = compact
    ? "rounded-2xl px-3 py-3 text-xs sm:px-4 sm:text-sm"
    : "rounded-md px-4 py-3 text-sm";
  const success = `border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 ${shape}`;
  const warning = `border border-amber-500/30 bg-amber-500/10 text-amber-500 ${shape}`;

  if (type === "single" || type === "multi") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {(question.options || []).map((option, optionIndex) => {
          const correct = correctIndexes.has(optionIndex);
          return (
            <div
              key={`${question.id}-option-${optionIndex}`}
              className={`flex min-w-0 flex-wrap items-center justify-between gap-2 ${correct ? success : `border border-border bg-card text-muted-foreground ${shape}`}`}
            >
              <div className="min-w-0 flex-1">
                <CodeText text={option} textClassName="text-inherit" />
              </div>
              {correct && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Correct
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "numerical") {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 ${success}`}>
        <span className="font-semibold">
          Answer: {question.numericAnswer ?? "Not set"}
          {question.numericTolerance ? ` ± ${question.numericTolerance}` : ""}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold">
          <CheckCircle2 className="h-4 w-4" /> Numerical
        </span>
      </div>
    );
  }

  if (type === "fill_blank") {
    return question.acceptedAnswers?.length ? (
      <div className="grid gap-3 md:grid-cols-2">
        {question.acceptedAnswers.map((group, blankIndex) => (
          <div key={`${question.id}-blank-${blankIndex}`} className={success}>
            <span className="font-bold">Blank {blankIndex + 1}: </span>
            {(Array.isArray(group) ? group : [group]).join(" / ")}
          </div>
        ))}
      </div>
    ) : (
      <div className={warning}>No accepted answers set for this blank</div>
    );
  }

  if (type === "short_answer" || type === "long_answer") {
    return question.gradingRubric?.length ? (
      <div className="grid gap-3 md:grid-cols-2">
        {question.gradingRubric.map((entry, pointIndex) => (
          <div
            key={`${question.id}-rubric-${pointIndex}`}
            className={`flex items-center justify-between gap-2 ${success}`}
          >
            <span>{entry.point}</span>
            <span className="shrink-0 font-bold">
              {entry.weight} pt{entry.weight === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    ) : question.expectedAnswer ? (
      <div className={`whitespace-pre-wrap ${success}`}>
        <span className="font-bold">Model answer: </span>
        {question.expectedAnswer}
        {question.answerWordLimit ? ` (~${question.answerWordLimit} words)` : ""}
      </div>
    ) : (
      <div className={warning}>No model answer or rubric set</div>
    );
  }

  return null;
}
