import { Clock3, Mail, Link2, UserRound } from "lucide-react";
import { scorePercent, formatDateTime } from "@/hooks/useMyResults";

// Read-only stat summary of a single submission - name/email, when it was
// taken, and the score. No expand-to-review and no delete: this used to
// reuse attempts.service.js#deleteAttempt (workspace-scoped, not
// requester-scoped), which meant a mock test owner could delete an
// attempt they don't own and it would vanish from that person's own My
// Results page too, since it's the same exam_attempts row. Deletion of
// an attempt stays a "my own result" action on the My Results page only.
export default function SubmissionCard({ submission }) {
  const isSubmitted = submission.status === "submitted";
  const pct = scorePercent(submission);

  return (
    <div className="surface-card rounded-2xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-foreground truncate">
            {submission.takerName}
          </div>
          {submission.takerEmail && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <Mail className="w-3 h-3 shrink-0" /> {submission.takerEmail}
            </div>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
            submission.isGuest
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {submission.isGuest ? (
            <>
              <Link2 className="w-2.5 h-2.5" /> Shared link
            </>
          ) : (
            <>
              <UserRound className="w-2.5 h-2.5" /> Member
            </>
          )}
        </span>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock3 className="w-3 h-3 shrink-0" />
        {formatDateTime(submission.startedAt)}
        {!isSubmitted && (
          <span className="ml-1 font-semibold text-amber-500">
            {submission.status === "in_progress" ? "In progress" : "Abandoned"}
          </span>
        )}
      </div>

      {isSubmitted ? (
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <div className="text-sm font-bold text-foreground">
            {submission.correctCount}/{submission.totalQuestions}{" "}
            <span className="font-medium text-muted-foreground">correct</span>
          </div>
          <div
            className={`text-sm font-black ${
              pct >= 80
                ? "text-emerald-500"
                : pct >= 60
                  ? "text-amber-500"
                  : "text-red-500"
            }`}
          >
            {pct}%
          </div>
        </div>
      ) : (
        <div className="pt-1 border-t border-border/60 text-xs text-muted-foreground">
          Not finished - no score yet.
        </div>
      )}
    </div>
  );
}
