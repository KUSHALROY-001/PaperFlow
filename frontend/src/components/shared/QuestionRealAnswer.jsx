import { CheckCircle, Lightbulb } from "lucide-react";
import AnimatedBlock from "./AnimatedBlock";
import CodeText from "./CodeText";
import MathText from "./MathText";
import {
  getCorrectOptions,
  getRealAnswerBody,
  hasRealAnswer,
} from "./QuestionAnswerReview";

/**
 * The "Real answer" block for one question (answer key + explanation).
 * Styled as a correction sitting under the user's own answer: brand-orange
 * accent rail and label, deliberately different from the green/red used for
 * the user's answer so the two never read as the same thing.
 */
export default function QuestionRealAnswer({ question, open }) {
  const type = question.questionType || "single";
  const isChoice = type === "single" || type === "multi";
  const correctOptions = isChoice ? getCorrectOptions(question) : [];
  const body = isChoice ? null : getRealAnswerBody(question);
  const explanation = question.explanation;

  if (!hasRealAnswer(question)) return null;

  return (
    <AnimatedBlock open={open}>
      <section
        aria-label="Real answer"
        className="mt-2 rounded-xl border border-orange-500/20 border-l-4 border-l-orange-500 bg-orange-500/5 px-3 py-2.5 text-xs"
      >
        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
          Real answer
        </div>

        {correctOptions.length > 0 && (
          <ul className="space-y-1 text-foreground">
            {correctOptions.map((option) => (
              <li key={option.idx} className="flex items-start gap-1.5">
                <CheckCircle
                  className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                <span className="whitespace-pre-wrap wrap-break-word">
                  <MathText text={option.text} />
                </span>
              </li>
            ))}
          </ul>
        )}

        {body && <div className="text-foreground">{body}</div>}

        {explanation && (
          <div
            className={
              correctOptions.length > 0 || body
                ? "mt-2 pt-2 border-t border-orange-500/20"
                : ""
            }
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Explanation
            </div>
            <div className="space-y-2">
              <CodeText text={explanation} textClassName="text-sm text-foreground" />
            </div>
          </div>
        )}
      </section>
    </AnimatedBlock>
  );
}
