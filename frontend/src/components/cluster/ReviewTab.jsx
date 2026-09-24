import MarksBadge from "@/components/shared/MarksBadge";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Flag,
  Loader2,
  ShieldAlert,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { ConfirmDialog } from "../design-system/ConfirmDialog";
import QuestionContent, {
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";
import {
  getQuestionOrderMode,
  resolveQuestionMarks,
} from "@/utils/mockTestHelpers";
import QuestionJumpInput from "../shared/QuestionJumpInput";
import ScrollToTopButton from "../shared/ScrollToTopButton";
import LiveExtractionBanner from "./LiveExtractionBanner";

const filters = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "review", label: "Needs Review" },
  { id: "rejected", label: "Flagged" },
  { id: "low_confidence", label: "Low Confidence" },
  { id: "stale_reprocess", label: "Not in Latest Reprocess" },
];

function getConfidenceTone(confidence) {
  if (confidence >= 90) {
    return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  }
  if (confidence >= 70) {
    return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  }
  return "bg-red-500/10 text-red-500 border border-red-500/20";
}

export default function ReviewTab({
  questions,
  isProcessing = false,
  isStreamingQuestions = false,
  loadedQuestionCount = 0,
  totalQuestionCount = 0,
  hasMoreQuestions = false,
  onLoadMoreQuestions,
  onLoadThroughQuestion,
  mocktest,
  onStatusChange,
  onDelete,
  onRestoreStale,
  clusterId: propClusterId,
  mockTestId: propMockTestId,
}) {
  const { isViewer } = useAuth();
  const params = useParams();
  const clusterId = propClusterId || params.clusterId;
  const mockTestId = propMockTestId || params.mockTestId;
  const isRandomOrder = getQuestionOrderMode(mocktest) === "random";
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState(
    [questions[0]?.id].filter(Boolean),
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Set by handleJumpToQuestion, consumed by the effect below. Needed
  // (not a plain scrollIntoView call inline) because jumping to a
  // question can require two state changes to even render its DOM node
  // first - clearing an active filter that excludes it, and expanding it
  // if collapsed - and the scroll has to wait for whichever of those
  // actually happens.
  const [pendingScrollTo, setPendingScrollTo] = useState(null);

  // Returns true/false (found or not) - QuestionJumpInput owns showing
  // the "not found" message itself based on this return value. Searches
  // the full `questions` list, not filteredQuestions - a question hidden
  // by the current filter should still be jumpable to, not reported as
  // "not found".
  const handleJumpToQuestion = (questionNo) => {
    const target =
      questions.find((q) => q.questionNo === questionNo) ||
      questions.find((q) => q.displayIndex === questionNo);
    if (!target) {
      if (!onLoadThroughQuestion?.(questionNo)) return false;
      setActiveFilter("all");
      setPendingScrollTo(questionNo);
      return true;
    }
    setActiveFilter("all");
    setExpandedIds((current) =>
      current.includes(target.id) ? current : [...current, target.id],
    );
    setPendingScrollTo(target.questionNo);
    return true;
  };

  const filteredQuestions = useMemo(() => {
    if (activeFilter === "all") {
      return questions;
    }
    if (activeFilter === "low_confidence") {
      return questions.filter(
        (question) => Number(question.confidence || 0) < 70,
      );
    }
    if (activeFilter === "stale_reprocess") {
      return questions.filter((question) => question.staleFromReprocess);
    }

    return questions.filter((question) => question.status === activeFilter);
  }, [activeFilter, questions]);

  const summary = useMemo(
    () => ({
      approved: questions.filter((question) => question.status === "approved")
        .length,
      review: questions.filter((question) => question.status === "review")
        .length,
      flagged: questions.filter((question) => question.status === "rejected")
        .length,
      lowConfidence: questions.filter(
        (question) => Number(question.confidence || 0) < 70,
      ).length,
      staleReprocess: questions.filter(
        (question) => question.staleFromReprocess,
      ).length,
    }),
    [questions],
  );

  const toggleExpanded = (questionId) => {
    setExpandedIds((currentIds) =>
      currentIds.includes(questionId)
        ? currentIds.filter((id) => id !== questionId)
        : [...currentIds, questionId],
    );
  };

  useEffect(() => {
    if (pendingScrollTo == null) return undefined;
    const el = document.getElementById(`question-${pendingScrollTo}`);
    // Not in the DOM yet on this render (filter/expand state just
    // changed and hasn't repainted) - do nothing and let the next run of
    // this effect, triggered by activeFilter/filteredQuestions changing,
    // try again.
    if (!el) return undefined;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-orange-500", "ring-offset-2");
    const timeoutId = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-orange-500", "ring-offset-2");
    }, 1600);
    setPendingScrollTo(null);
    return () => window.clearTimeout(timeoutId);
  }, [pendingScrollTo, activeFilter, filteredQuestions]);

  return (
    <div className="space-y-6 font-inter">
      <LiveExtractionBanner
        isProcessing={isProcessing}
        isStreaming={isStreamingQuestions}
        loadedCount={loadedQuestionCount}
        totalCount={totalQuestionCount}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#ea580c] text-white shadow-xs"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <QuestionJumpInput onJump={handleJumpToQuestion} />
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-500">
              Approved
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.approved}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-500">
              Needs Review
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.review}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-500">
              Flagged
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.flagged}
            </div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm sm:px-4">
            <div className="text-xs font-bold uppercase tracking-wide text-red-500">
              Low Confidence
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {summary.lowConfidence}
            </div>
          </div>
          {summary.staleReprocess > 0 && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-sm sm:px-4">
              <div className="text-xs font-bold uppercase tracking-wide text-rose-500">
                Not in Latest Reprocess
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {summary.staleReprocess}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {isRandomOrder && questions.length > 0 && (
          <p className="text-xs font-semibold text-muted-foreground rounded-xl border border-border bg-muted/40 px-3 py-2">
            Showing questions in random student order. Paper numbers are
            unchanged.
          </p>
        )}
        {filteredQuestions.map((question, questionIndex) => {
          const marks =
            question.effectiveMarks || resolveQuestionMarks(question, mocktest);
          const listNumber = isRandomOrder
            ? question.displayIndex
            : question.questionNo;
          const expanded = expandedIds.includes(question.id);
          const isApproved = question.status === "approved";
          const isFlagged = question.status === "rejected";

          let borderClass;
          if (isApproved) {
            borderClass = "border-emerald-500/30";
          } else if (isFlagged) {
            borderClass = "border-amber-500/30";
          } else {
            borderClass = "border-border";
          }

          let approveClass;
          let approveTitle;
          if (isViewer) {
            approveClass =
              "opacity-50 cursor-not-allowed border border-emerald-500/20 text-emerald-500";
            approveTitle = "Editor role is required to approve questions";
          } else if (isApproved) {
            approveClass =
              "bg-emerald-500 text-white border border-emerald-500 shadow-xs hover:bg-emerald-600";
            approveTitle = "Approved (click to unapprove)";
          } else {
            approveClass =
              "border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10";
            approveTitle = "Approve question";
          }

          let flagClass;
          let flagTitle;
          if (isViewer) {
            flagClass =
              "opacity-50 cursor-not-allowed border border-amber-500/20 text-amber-500";
            flagTitle = "Editor role is required to flag questions";
          } else if (isFlagged) {
            flagClass =
              "bg-amber-500 text-white border border-amber-500 shadow-xs hover:bg-amber-600";
            flagTitle = "Flagged (click to unflag)";
          } else {
            flagClass =
              "border border-amber-500/20 text-amber-500 hover:bg-amber-500/10";
            flagTitle = "Flag question";
          }

          return (
            <div
              key={question.id}
              id={`question-${question.questionNo}`}
              data-tour={questionIndex === 0 ? "review-first-card" : undefined}
              className={`rounded-3xl p-3 sm:p-5 surface-card border transition-all ${borderClass}`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-3 py-1 text-xs font-bold text-orange-500 shrink-0">
                        Q{listNumber}
                      </span>
                      {isRandomOrder &&
                        Number(question.questionNo) !== Number(listNumber) && (
                          <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Paper Q{question.questionNo}
                          </span>
                        )}
                      <span className="rounded-full bg-muted border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {question.topic}
                      </span>
                      <MarksBadge
                        marksPerCorrect={marks.marksPerCorrect}
                        negativeMarksPerWrong={marks.negativeMarksPerWrong}
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
                        {question.confidence}% confidence
                      </span>
                      {isApproved && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-500 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {isFlagged && (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-500 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      )}
                      {question.staleFromReprocess && (
                        <span
                          className="rounded-full bg-rose-500/15 border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-500 flex items-center gap-1"
                          title={
                            question.staleReason ||
                            "Not found in the most recent reprocess of this PDF"
                          }
                        >
                          <ShieldAlert className="w-3 h-3" /> Not in latest
                          reprocess
                        </span>
                      )}
                    </div>
                    {clusterId && mockTestId && (
                      <div className="flex items-center gap-2 shrink-0">
                      {question.staleFromReprocess && (
                        <button
                          type="button"
                          disabled={isViewer}
                          onClick={() => !isViewer && onRestoreStale?.(question.id)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 text-emerald-500 transition-all ${isViewer ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-500/10"}`}
                          title={isViewer ? "Editor role is required to add this question" : "Add this question back to the current mock test"}
                          aria-label="Add question back to current mock test"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                      <Link
                        to={`/cluster/${clusterId}/mock/${mockTestId}/editor?qId=${question.id}`}
                        data-tour={
                          questionIndex === 0 ? "review-edit" : undefined
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-orange-500/40 hover:text-orange-500 hover:bg-orange-500/10 shrink-0"
                        title={`Edit Question ${question.questionNo} in Question Editor`}
                      >
                        <Edit2 className="h-4 w-4 text-orange-500" />
                      </Link>
                      </div>
                    )}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpanded(question.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpanded(question.id);
                      }
                    }}
                    className="w-full text-left cursor-pointer"
                  >
                    <DiagramAssetsProvider assets={question.diagramAssets}>
                      <QuestionContent
                        text={question.text}
                        passage={question.passage}
                        textClassName="text-base sm:text-lg text-foreground"
                      />
                    </DiagramAssetsProvider>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Source: {question.sourceLine}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 shrink-0"
                  data-tour={questionIndex === 0 ? "review-actions" : undefined}
                >
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() =>
                      !isViewer &&
                      onStatusChange(
                        question.id,
                        isApproved ? "review" : "approved",
                      )
                    }
                    className={`rounded-xl p-2 transition-all ${approveClass}`}
                    aria-label="Approve question"
                    title={approveTitle}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() =>
                      !isViewer &&
                      onStatusChange(
                        question.id,
                        isFlagged ? "review" : "rejected",
                      )
                    }
                    className={`rounded-xl p-2 transition-all ${flagClass}`}
                    aria-label="Flag question"
                    title={flagTitle}
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => !isViewer && setDeleteTarget(question)}
                    className={`rounded-xl border border-red-500/20 p-2 text-red-500 transition-colors ${
                      isViewer
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-red-500/10"
                    }`}
                    aria-label="Delete question"
                    title={
                      isViewer
                        ? "Editor role is required to delete questions"
                        : "Delete question"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(question.id)}
                    className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Expand question details"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="mt-5 space-y-3 rounded-2xl border border-border bg-muted/40 p-2 sm:p-4">
                  <DiagramAssetsProvider assets={question.diagramAssets}>
                    {question.questionType === "numerical" && (
                      // This tab only ever rendered question.options - fine
                      // for MCQs, but numerical questions have no options at
                      // all, so their answer (now correctly mapped through
                      // mapQuestion as question.numericAnswer/answer) never
                      // had anywhere to display. Same reason the JSON export
                      // and question editor needed separate fixes: three
                      // different consumers of the same underlying field,
                      // each with its own gap.
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-3 py-3 text-xs text-emerald-500 sm:px-4 sm:text-sm">
                        <span className="font-semibold">
                          Answer: {question.numericAnswer ?? "Not set"}
                          {question.numericTolerance
                            ? ` ± ${question.numericTolerance}`
                            : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold">
                          <CheckCircle2 className="h-4 w-4" />
                          Numerical
                        </span>
                      </div>
                    )}
                    {question.questionType === "fill_blank" &&
                      // Same gap as numerical above - fill_blank has no
                      // options either, its answer key is
                      // question.acceptedAnswers: one array of acceptable
                      // strings PER BLANK, in blank order (see
                      // worker/ai/schemas.py's accepted_answers field).
                      (question.acceptedAnswers?.length ? (
                        <div className="space-y-2">
                          {question.acceptedAnswers.map((group, blankIndex) => (
                            <div
                              key={`${question.id}-blank-${blankIndex}`}
                              className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-3 py-3 text-xs text-emerald-500 sm:px-4 sm:text-sm"
                            >
                              <span className="font-bold shrink-0">
                                Blank {blankIndex + 1}:
                              </span>
                              <span className="font-semibold">
                                {(Array.isArray(group) ? group : [group]).join(
                                  " / ",
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-500 sm:px-4 sm:text-sm">
                          No accepted answers set for this blank
                        </div>
                      ))}
                    {(question.questionType === "short_answer" ||
                      question.questionType === "long_answer") &&
                      // No options either - the answer key is a rubric
                      // (question.gradingRubric: [{point, weight}], graded
                      // point-by-point at submission time) when the paper's
                      // marking scheme was detailed enough to derive one,
                      // else a single model answer (question.expectedAnswer).
                      (question.gradingRubric?.length ? (
                        <div className="space-y-1.5">
                          {question.gradingRubric.map((entry, pointIndex) => (
                            <div
                              key={`${question.id}-rubric-${pointIndex}`}
                              className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-3 py-3 text-xs text-emerald-500 sm:px-4 sm:text-sm"
                            >
                              <span>{entry.point}</span>
                              <span className="shrink-0 font-bold">
                                {entry.weight} pt
                                {entry.weight === 1 ? "" : "s"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : question.expectedAnswer ? (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-3 py-3 text-xs text-emerald-500 whitespace-pre-wrap sm:px-4 sm:text-sm">
                          <span className="font-bold">Model answer: </span>
                          {question.expectedAnswer}
                          {question.answerWordLimit
                            ? ` (~${question.answerWordLimit} words)`
                            : ""}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-500 sm:px-4 sm:text-sm">
                          No model answer or rubric set
                        </div>
                      ))}
                    {question.options.map((option, optionIndex) => {
                      const correct = option === question.answer;
                      return (
                        <div
                          key={`${question.id}-option-${optionIndex}`}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-3 text-xs sm:px-4 sm:text-sm ${
                            correct
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                              : "bg-card text-muted-foreground border border-border"
                          }`}
                        >
                          <span className="whitespace-pre-wrap wrap-break-word">
                            <MathText text={option} />
                          </span>
                          {correct && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold">
                              <CheckCircle2 className="h-4 w-4" />
                              Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <QuestionExplanation explanation={question.explanation} />
                  </DiagramAssetsProvider>
                  {question.status === "rejected" && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-500">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Needs manual review before export
                    </div>
                  )}
                  {question.aiIssues?.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
                      <div className="mb-1 font-bold">AI review notes</div>
                      <ul className="list-disc space-y-1 pl-5">
                        {question.aiIssues.map((issue, index) => (
                          <li key={`${question.id}-issue-${index}`}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {hasMoreQuestions && (
          <div className="flex flex-col items-center gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {loadedQuestionCount} of {totalQuestionCount} questions
            </p>
            <button
              type="button"
              onClick={onLoadMoreQuestions}
              disabled={isStreamingQuestions}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md border border-orange-500/30 px-4 py-2 text-sm font-semibold text-orange-600 transition-colors dark:text-orange-400 ${
                isStreamingQuestions
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-orange-500/10"
              }`}
            >
              {isStreamingQuestions && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isStreamingQuestions ? "Loading..." : "Load 50 more"}
            </button>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete Q${deleteTarget.questionNo}?`}
          description="Are you sure you want to delete this question? This action cannot be undone."
          confirmLabel="Delete Question"
          destructive={true}
          onConfirm={async () => {
            await onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
      <ScrollToTopButton />
    </div>
  );
}
