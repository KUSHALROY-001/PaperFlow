import MarksBadge from "@/components/shared/MarksBadge";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Edit2,
  Flag,
  FolderOpen,
  ShieldAlert,
  SkipForward,
} from "lucide-react";
import QuestionContent, {
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

// Same three-tier bucketing ReviewTab.jsx uses (getConfidenceTone) -
// duplicated rather than imported since ReviewTab doesn't export it, and
// pulling one function out into a shared module for two call sites this
// small isn't worth the extra indirection.
export function getConfidenceTone(confidence) {
  if (confidence === null || confidence === undefined) {
    return "bg-muted text-muted-foreground border border-border";
  }
  if (confidence >= 90) {
    return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  }
  if (confidence >= 70) {
    return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  }
  return "bg-red-500/10 text-red-500 border border-red-500/20";
}

export default function QueueQuestionCard({
  question,
  onApprove,
  onReject,
  onSkip,
  isBusy,
  isViewer,
}) {
  const editHref = `/cluster/${question.clusterId}/mock/${question.mockTestId}/editor?qId=${question.id}&returnTo=/review-queue`;

  return (
    <div className="surface-card rounded-3xl border border-border p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-3 py-1 text-xs font-bold text-orange-500 shrink-0">
            Q{question.questionNo}
          </span>
          <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
            {question.topic}
          </span>
          <MarksBadge
            marksPerCorrect={
              question.marksPerCorrect ?? question.marks_per_correct
            }
            negativeMarksPerWrong={
              question.negativeMarksPerWrong ??
              question.negative_marks_per_wrong
            }
            unsetLabel="Marks unset"
          />
          {question.subtopic && (
            <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
              {question.subtopic}
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getConfidenceTone(question.confidence)}`}
          >
            {question.confidence === null || question.confidence === undefined
              ? "No confidence score"
              : `${question.confidence}% confidence`}
          </span>
        </div>
        <Link
          to={editHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="Edit in the full question editor (E)"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Link>
      </div>

      <Link
        to={`/cluster/${question.clusterId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        {question.clusterName} <span className="opacity-50">/</span>{" "}
        {question.mockTestName}
      </Link>

      <DiagramAssetsProvider assets={question.diagramAssets}>
        <QuestionContent
          text={question.text}
          passage={question.passage}
          textClassName="text-base sm:text-lg font-bold text-foreground"
        />

        <div className="space-y-2">
          {question.options.map((option, optionIndex) => {
            const correct = question.correctOptionIndexes.includes(optionIndex);
            return (
              <div
                key={optionIndex}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-3 text-xs sm:px-4 sm:text-sm font-medium ${
                  correct
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : "bg-card text-muted-foreground border border-border"
                }`}
              >
                <span className="whitespace-pre-wrap wrap-break-word">
                  <MathText text={option} />
                </span>
                {correct && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    Correct
                  </span>
                )}
              </div>
            );
          })}
          <QuestionExplanation explanation={question.explanation} />
        </div>
      </DiagramAssetsProvider>

      {question.aiIssues?.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
          <div className="mb-1 flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" /> AI review notes
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {question.aiIssues.map((issue, index) => (
              <li key={`${question.id}-issue-${index}`}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <button
          type="button"
          disabled={isViewer || isBusy}
          onClick={() => onApprove(question.id)}
          title={
            isViewer
              ? "Editor role is required to approve questions"
              : "Approve (A)"
          }
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            isViewer || isBusy
              ? "opacity-50 cursor-not-allowed border border-emerald-500/20 text-emerald-500"
              : "bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
          }`}
        >
          <Check className="h-4 w-4" /> Approve
        </button>
        <button
          type="button"
          disabled={isViewer || isBusy}
          onClick={() => onReject(question.id)}
          title={
            isViewer
              ? "Editor role is required to reject questions"
              : "Reject (R)"
          }
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            isViewer || isBusy
              ? "opacity-50 cursor-not-allowed border border-red-500/20 text-red-500"
              : "border border-red-500/30 text-red-500 hover:bg-red-500/10"
          }`}
        >
          <Flag className="h-4 w-4" /> Reject
        </button>
        <button
          type="button"
          onClick={onSkip}
          title="Skip for now, decide later (→)"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <SkipForward className="h-4 w-4" /> Skip
        </button>
      </div>
    </div>
  );
}
