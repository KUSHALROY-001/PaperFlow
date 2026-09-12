import { Link } from "react-router-dom";
import { Copy } from "lucide-react";
import QuestionContent, {
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";

// One instance of the group's repeated question, in one mock test. Purely
// informational - no action, no button - unlike the old QuestionSide this
// replaces, which had a "Keep" button per side.
function GroupMember({ question }) {
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
          textClassName="text-sm text-foreground"
        />
        {question.options?.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {question.options.map((option, index) => {
              const optionText =
                typeof option === "string" ? option : option.optionText;

              return (
                <li
                  key={typeof option === "string" ? index : option.optionIndex}
                  className="text-xs text-muted-foreground pl-3 border-l-2 border-border whitespace-pre-wrap wrap-break-word"
                >
                  <MathText text={optionText} />
                </li>
              );
            })}
          </ul>
        )}
        <QuestionExplanation explanation={question.explanation} />
      </div>
    </div>
  );
}

// One duplicate group at a time, all of its member questions laid out
// together - unlike the old pairwise card, a group can hold more than two
// questions (the same question reused across several mock tests), so this
// wraps into a grid instead of a fixed two-column layout. Read-only: no
// "keep" or "dismiss" action anywhere on this card.
export default function DuplicateGroupCard({ group }) {
  return (
    <div className="surface-card rounded-3xl border border-border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Copy className="w-4 h-4 text-orange-500" />
          Repeated in {group.questions.length} mock tests
        </div>
        <span className="inline-flex items-center rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs font-bold text-orange-500">
          {Math.round(group.similarityScore * 100)}% similar
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {group.questions.map((question) => (
          <GroupMember key={question.questionId} question={question} />
        ))}
      </div>
    </div>
  );
}
