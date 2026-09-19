import { CheckCircle, XCircle } from "lucide-react";
import MathText from "./MathText";

/** True when the student left the question blank (no option pick / no text). */
export function isQuestionSkipped(question) {
  const type = question.questionType || "single";
  if (type === "single" || type === "multi") {
    return !(question.selectedOptionIndexes?.length > 0);
  }
  return !(question.answerText || "").trim();
}

/** Written answers use partial credit — treat attended as success for colour. */
export function isWrittenQuestion(question) {
  const type = question.questionType || "single";
  return type === "short_answer" || type === "long_answer";
}

/**
 * Card / filter classification:
 * - skipped → neutral
 * - written + answered → positive (green), even with partial marks
 * - isCorrect → positive
 * - else → wrong (red)
 */
export function getAnswerOutcome(question) {
  if (isQuestionSkipped(question)) return "skipped";
  if (isWrittenQuestion(question)) return "positive";
  if (question.isCorrect === true) return "positive";
  return "wrong";
}

function parseFillBlankAnswers(answerText) {
  if (!answerText || !String(answerText).trim()) return [];
  try {
    const parsed = JSON.parse(answerText);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => (v == null ? "" : String(v)));
    }
  } catch {
    // stored as a plain string for single-blank questions
  }
  return [String(answerText)];
}

function formatAcceptedAnswers(acceptedAnswers) {
  if (!Array.isArray(acceptedAnswers) || acceptedAnswers.length === 0) {
    return null;
  }
  return acceptedAnswers.map((group, index) => {
    const variants = Array.isArray(group)
      ? group.filter(Boolean)
      : [group].filter(Boolean);
    return {
      label: acceptedAnswers.length > 1 ? `Blank ${index + 1}` : "Accepted",
      text: variants.join(" / ") || "—",
    };
  });
}

function normalizeOption(option, optionIndex) {
  return typeof option === "string"
    ? { optionIndex, optionText: option }
    : option;
}

/** MCQ: the option(s) that are correct, as { idx, text }. */
export function getCorrectOptions(question) {
  const correctIdx = question.correctOptionIndexes || [];
  return (question.options || [])
    .map((option, i) => {
      const normalized = normalizeOption(option, i);
      return {
        idx: normalized.optionIndex ?? i,
        text: normalized.optionText,
      };
    })
    .filter((option) => correctIdx.includes(option.idx));
}

/**
 * Non-MCQ answer key (numerical / fill-blank / written model answer) as JSX,
 * or null when the question has none. Same content the old inline
 * "Correct" / "Model answer" box rendered.
 */
export function getRealAnswerBody(question) {
  const type = question.questionType || "single";
  if (type === "numerical" && question.numericAnswer != null) {
    const tol =
      question.numericTolerance != null && question.numericTolerance !== 0
        ? ` ± ${question.numericTolerance}`
        : "";
    return <MathText text={`${question.numericAnswer}${tol}`} />;
  }
  if (type === "fill_blank") {
    const groups = formatAcceptedAnswers(question.acceptedAnswers);
    if (!groups) return null;
    return (
      <span className="whitespace-pre-wrap wrap-break-word">
        {groups.map((g, i) => (
          <span key={i}>
            {groups.length > 1 && (
              <span className="font-semibold mr-1">{g.label}:</span>
            )}
            <MathText text={g.text} />
            {i < groups.length - 1 ? <br /> : null}
          </span>
        ))}
      </span>
    );
  }
  if (
    (type === "short_answer" || type === "long_answer") &&
    question.expectedAnswer
  ) {
    return (
      <span className="whitespace-pre-wrap wrap-break-word">
        <MathText text={String(question.expectedAnswer)} />
      </span>
    );
  }
  return null;
}

/** True when there is anything to reveal: an answer key or an explanation. */
export function hasRealAnswer(question) {
  const type = question.questionType || "single";
  if (type === "single" || type === "multi") {
    if (getCorrectOptions(question).length > 0) return true;
  } else if (getRealAnswerBody(question) != null) {
    return true;
  }
  return Boolean(question.explanation);
}

/**
 * Renders the student's own answer for any question type. MCQs keep the full
 * option list; written/numerical/fill-blank show the answer text.
 *
 * The real answer is NOT rendered here (see QuestionRealAnswer). The only
 * thing `showRealAnswer` changes is the MCQ option list: the correct option
 * is highlighted only once revealed. The student's own pick keeps its
 * existing styling either way.
 */
export default function QuestionAnswerReview({
  question,
  showRealAnswer = false,
}) {
  const type = question.questionType || "single";
  const skipped = isQuestionSkipped(question);
  const correct = question.isCorrect === true;
  const options = question.options || [];
  const selected = question.selectedOptionIndexes || [];

  if (type === "single" || type === "multi") {
    if (!options.length) return null;
    return (
      <div className="mt-2 space-y-1.5">
        {options.map((option, optionIndex) => {
          const normalizedOption = normalizeOption(option, optionIndex);
          const idx = normalizedOption.optionIndex ?? optionIndex;
          const isCorrectOption =
            showRealAnswer && question.correctOptionIndexes?.includes(idx);
          const isYourWrongPick =
            !skipped && !correct && selected.includes(idx);
          const isYourCorrectPick =
            !skipped && correct && selected.includes(idx);

          let optionClass;
          if (isCorrectOption) {
            optionClass =
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-600";
          } else if (isYourWrongPick) {
            optionClass = "bg-red-500/10 border-red-500/30 text-red-600";
          } else {
            optionClass = "bg-card border-border text-muted-foreground";
          }

          return (
            <div
              key={idx}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${optionClass}`}
            >
              <span className="flex-1 whitespace-pre-wrap wrap-break-word">
                <MathText text={normalizedOption.optionText} />
              </span>
              {isCorrectOption && (
                <span className="inline-flex items-center gap-1 font-bold shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isYourCorrectPick ? "Your answer · Correct" : "Correct"}
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
    );
  }

  const yourAnswerClass = skipped
    ? "text-muted-foreground"
    : correct || isWrittenQuestion(question)
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  let yourAnswerBody = null;
  if (skipped) {
    yourAnswerBody = <span className="italic">Not answered</span>;
  } else if (type === "fill_blank") {
    const blanks = parseFillBlankAnswers(question.answerText);
    yourAnswerBody = (
      <span className="whitespace-pre-wrap wrap-break-word">
        {blanks.map((blank, i) => (
          <span key={i}>
            {blanks.length > 1 && (
              <span className="text-muted-foreground font-semibold mr-1">
                Blank {i + 1}:
              </span>
            )}
            <MathText text={blank || "—"} />
            {i < blanks.length - 1 ? <br /> : null}
          </span>
        ))}
      </span>
    );
  } else {
    yourAnswerBody = (
      <span className="whitespace-pre-wrap wrap-break-word">
        <MathText text={String(question.answerText || "")} />
      </span>
    );
  }

  const pendingAi =
    isWrittenQuestion(question) &&
    question.gradingStatus === "pending_grading";

  return (
    <div className="mt-2 space-y-1.5 text-xs">
      <div
        className={`rounded-xl border px-3 py-2 ${
          skipped
            ? "bg-card border-border text-muted-foreground"
            : correct || isWrittenQuestion(question)
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-red-500/10 border-red-500/30"
        }`}
      >
        <div className={`font-semibold mb-0.5 ${yourAnswerClass}`}>
          Your answer
        </div>
        <div className={yourAnswerClass}>{yourAnswerBody}</div>
      </div>

      {pendingAi && (
        <p className="text-muted-foreground italic px-1">
          Written answer is still being graded…
        </p>
      )}

      {!pendingAi && isWrittenQuestion(question) && question.aiReasoning && (
        <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
          <div className="font-semibold mb-0.5 text-foreground/80">
            Grading note
          </div>
          <div className="whitespace-pre-wrap wrap-break-word">
            {question.aiReasoning}
          </div>
        </div>
      )}
    </div>
  );
}
