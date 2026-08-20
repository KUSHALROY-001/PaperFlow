import { Link } from "react-router-dom";
import { ArrowLeftRight, Check, Loader2, X } from "lucide-react";
import QuestionContent from "../shared/QuestionContent";

function QuestionSide({ question, onKeep, disabled, side }) {
  return (
    <div className="flex-1 min-w-0 surface-card rounded-2xl border border-border p-4 sm:p-5 flex flex-col">
      <Link
        to={`/cluster/${question.mockTestId}`}
        className="text-xs font-semibold text-muted-foreground hover:text-orange-500 transition-colors mb-3 truncate"
        title={question.mockTestName}
      >
        {question.mockTestName} · Q{question.questionNo}
      </Link>
      {question.subtopic && (
        <span className="mb-3 inline-flex w-fit items-center rounded-full bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
          {question.subtopic}
        </span>
      )}
      <div className="flex-1">
        <QuestionContent
          text={question.text}
          passage={question.passage}
          explanation={question.explanation}
          hasCode={question.hasCode}
          codeLanguage={question.codeLanguage}
          codeSnippet={question.codeSnippet}
          textClassName="text-sm text-foreground"
        />
        {question.options?.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {question.options.map((option) => (
              <li
                key={option.optionIndex}
                className="text-xs text-muted-foreground pl-3 border-l-2 border-border"
              >
                {option.optionText}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onKeep}
        disabled={disabled}
        className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold hover:bg-emerald-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check className="w-4 h-4" /> Keep {side}
      </button>
    </div>
  );
}

// One pair at a time - the whole point of this view is comparing two
// things side by side, unlike Review Queue's single-question focus view,
// so both need to be on screen together rather than one after another.
export default function DuplicatePairCard({ pair, onResolve, isResolving }) {
  return (
    <div className="surface-card rounded-3xl border border-border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ArrowLeftRight className="w-4 h-4 text-orange-500" />
          Possible duplicate
        </div>
        <span className="inline-flex items-center rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs font-bold text-orange-500">
          {Math.round(pair.similarityScore * 100)}% similar
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <QuestionSide
          question={pair.questionA}
          side="left"
          disabled={isResolving}
          onKeep={() =>
            onResolve(pair.id, {
              action: "merge",
              keepQuestionId: pair.questionA.questionId,
            })
          }
        />
        <QuestionSide
          question={pair.questionB}
          side="right"
          disabled={isResolving}
          onKeep={() =>
            onResolve(pair.id, {
              action: "merge",
              keepQuestionId: pair.questionB.questionId,
            })
          }
        />
      </div>

      <button
        type="button"
        onClick={() => onResolve(pair.id, { action: "dismiss" })}
        disabled={isResolving}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-muted-foreground text-xs sm:text-sm font-bold hover:text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isResolving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
        Not a duplicate
      </button>
    </div>
  );
}
