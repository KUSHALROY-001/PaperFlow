import { AlertTriangle, Check, Copy, FolderOpen, Plus } from "lucide-react";
import { StatusBadge } from "../design-system/StatusBadge";
import QuestionContent, { QuestionExplanation } from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

const STATUS_TONE = {
  approved: "success",
  rejected: "error",
  review: "warning",
};

const STATUS_LABEL = {
  approved: "Approved",
  rejected: "Rejected",
  review: "Needs review",
};

export default function BankQuestionCard({
  question,
  onAddToTest,
  isViewer,
  justCopied,
  isSelected,
  onToggleSelect,
}) {
  return (
    <div
      className={`surface-card rounded-2xl border p-4 sm:p-5 transition-all ${
        isSelected
          ? "border-orange-500/50 ring-1 ring-orange-500/30"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <input
            type="checkbox"
            disabled={isViewer}
            checked={isSelected}
            onChange={() => !isViewer && onToggleSelect(question.id)}
            title={
              isViewer
                ? "Editor role is required to add questions"
                : "Select for bulk add"
            }
            className="mt-1 w-4 h-4 shrink-0 rounded border-border text-orange-500 focus:ring-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-bold text-muted-foreground">
                Q{question.questionNo}
              </span>
              <StatusBadge tone={STATUS_TONE[question.status] || "neutral"}>
                {STATUS_LABEL[question.status] || question.status}
              </StatusBadge>
              {question.topic && (
                <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  {question.topic}
                </span>
              )}
              {question.subtopic && (
                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                  {question.subtopic}
                </span>
              )}
              {/* Phase 2: how many OTHER mock tests already have a copy of
                  this exact question - only shown when it's actually been
                  used elsewhere, not as a permanent "0" badge on every
                  card. */}
              {question.usedInCount > 0 && (
                <span
                  title="How many other mock tests already have a copy of this question"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full"
                >
                  <Copy className="w-3 h-3" />
                  Used in {question.usedInCount} other{" "}
                  {question.usedInCount === 1 ? "test" : "tests"}
                </span>
              )}
              {/* Phase 2: basic trigram-similarity flag, scoped to
                  same-topic questions only (see the repository query for
                  why) - a hint worth a second look, not a hard block. */}
              {question.isPossibleDuplicate && (
                <span
                  title="Another question with similar text exists in this topic"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Possible duplicate
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {question.clusterName} &middot; {question.mockTestName}
              </span>
            </div>
            {/* Phase 2: the backward link - if this question is ITSELF a
                copy, show where it came from. sourceQuestionNo is only
                present when source_question_id resolved to a still-existing
                question (the LEFT JOIN in the repository returns NULL for
                both if the original was since deleted - a copy stays a
                valid, fully independent question either way, it just loses
                this one display line). */}
            {question.sourceQuestionNo && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                <Copy className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  Copied from Q{question.sourceQuestionNo} in{" "}
                  {question.sourceMockTestName}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={isViewer}
          onClick={() => !isViewer && onAddToTest(question)}
          title={
            isViewer ? "Editor role is required to add questions" : undefined
          }
          className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all ${
            isViewer
              ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
              : justCopied
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
          }`}
        >
          {justCopied ? (
            <>
              <Check className="w-4 h-4" /> Added
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add to Test
            </>
          )}
        </button>
      </div>

      <DiagramAssetsProvider assets={question.diagramAssets}>
        <QuestionContent
          text={question.text}
          passage={question.passage}
          diagramUrl={question.diagramUrl}
          textClassName="text-sm text-foreground"
        />

        <div className="mt-3 space-y-1">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`text-xs sm:text-sm px-2.5 py-1.5 rounded-lg ${
                question.correctOptionIndexes.includes(index)
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {String.fromCodePoint(65 + index)}. <MathText text={option} />
            </div>
          ))}
        </div>

        <QuestionExplanation explanation={question.explanation} />
      </DiagramAssetsProvider>
    </div>
  );
}
