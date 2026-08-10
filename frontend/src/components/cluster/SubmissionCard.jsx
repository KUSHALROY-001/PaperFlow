import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  AlertTriangle,
  Trash2,
  UserRound,
  Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import { scorePercent, formatDateTime } from "@/hooks/useMyResults";
import TopicBreakdownGrid from "@/components/my-results/TopicBreakdownGrid";
import QuestionReviewList from "@/components/my-results/QuestionReviewList";
import { ConfirmDialog } from "@/components/design-system/ConfirmDialog";

// Adapted from components/my-results/AttemptCard.jsx for the mock-test
// owner's Submissions tab - same expand-to-review pattern (api.getAttempt
// is workspace-scoped only, not restricted to the requesting user, so it
// already works for a guest's attempt with no backend change needed) but
// showing WHO took it instead of which mock test it was, since that's
// fixed/redundant on this page.
export default function SubmissionCard({ submission, onDeleteSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const [review, setReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSubmitted = submission.status === "submitted";
  const pct = scorePercent(submission);

  const handleToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && isSubmitted && !review && !loadingReview) {
      setLoadingReview(true);
      setReviewError(null);
      try {
        const result = await api.getAttempt(submission.id);
        setReview(result);
      } catch (error) {
        setReviewError(
          error.message || "Could not load this submission's details.",
        );
      } finally {
        setLoadingReview(false);
      }
    }
  };

  const topicBreakdown = {};
  if (review && review.questions) {
    for (const q of review.questions) {
      const topic = q.topic || "Untagged";
      if (!topicBreakdown[topic])
        topicBreakdown[topic] = { correct: 0, total: 0 };
      topicBreakdown[topic].total += 1;
      if (q.isCorrect) topicBreakdown[topic].correct += 1;
    }
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteSubmission(submission.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      setReviewError(error.message || "Could not delete this submission.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl border border-border overflow-hidden">
      <div className="p-2 sm:p-5 flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            !isSubmitted
              ? "bg-muted text-muted-foreground border border-border"
              : pct >= 80
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                : pct >= 60
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "bg-red-500/15 text-red-500 border border-red-500/20"
          }`}
        >
          {isSubmitted ? (
            <span className="text-lg font-black">{pct}%</span>
          ) : (
            <Clock3 className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
            <span className="truncate">{submission.takerName}</span>
            {submission.isGuest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <Link2 className="w-2.5 h-2.5" /> Shared link
              </span>
            )}
            {!submission.isGuest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border shrink-0">
                <UserRound className="w-2.5 h-2.5" /> Member
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatDateTime(submission.startedAt)}
            {!isSubmitted && (
              <span className="ml-2 font-semibold text-amber-500">
                {submission.status === "in_progress"
                  ? "In progress"
                  : "Abandoned"}
              </span>
            )}
          </div>
          {isSubmitted && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-48">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444",
                }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {expanded && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-500/15 transition-colors disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete
            </button>
          )}

          {isSubmitted && (
            <div className="text-right">
              <div className="text-sm md:text-lg font-bold text-foreground">
                {submission.correctCount}/{submission.totalQuestions}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                correct
              </div>
            </div>
          )}
          <button
            onClick={handleToggle}
            className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-orange-500 hover:border-orange-500/40 transition-all"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-3 sm:p-5 space-y-5 bg-muted/40">
          {!isSubmitted && (
            <p className="text-sm text-muted-foreground">
              This submission was never finished, so there's no scored
              review to show.
            </p>
          )}

          {isSubmitted && loadingReview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading review…
            </div>
          )}

          {isSubmitted && reviewError && (
            <div className="flex items-center gap-2 text-sm text-red-500 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {reviewError}
            </div>
          )}

          {isSubmitted && review && (
            <>
              <TopicBreakdownGrid topicBreakdown={topicBreakdown} />
              <QuestionReviewList questions={review.questions} />
            </>
          )}

          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-500/15 transition-colors disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete submission
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this submission?"
        description="This permanently removes this attempt and its answers. This cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
