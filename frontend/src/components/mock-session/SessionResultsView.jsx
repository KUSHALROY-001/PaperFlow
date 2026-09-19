import { Link } from "react-router-dom";
import { CheckCircle, XCircle, Home, LogIn, Loader2 } from "lucide-react";
import QuestionContent from "../shared/QuestionContent";
import QuestionAnswerReview, {
  getAnswerOutcome,
  hasRealAnswer,
} from "../shared/QuestionAnswerReview";
import QuestionRealAnswer from "../shared/QuestionRealAnswer";
import AnimatedBlock from "../shared/AnimatedBlock";
import {
  CollapsedPreview,
  QuestionCardControls,
  QuestionNumberChip,
  ReviewToolbar,
} from "../shared/ReviewControls";
import { useQuestionReviewState } from "@/hooks/useQuestionReviewState";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

// A written answer that is still being AI-graded shows a "Grading…" state
// instead of its answer review, so there is nothing to reveal yet. Module
// level so the reference is stable for the review-state hook.
function canRevealRealAnswer(question) {
  return question.gradingStatus !== "pending_grading" && hasRealAnswer(question);
}

export default function SessionResultsView({
  review,
  session,
  isGuest = false,
  guestName,
  showSaveResultBanner = false,
  onSaveResult,
  claimStatus = "idle",
  saveLabel = "Log in to save",
  // Written-answer (short/long-answer) AI grading finishing after this
  // screen is already showing - see useExamSession.js's polling effect,
  // which is what keeps `review` (and therefore these two props) moving
  // without the person doing anything.
  pendingGradingCount = 0,
  gradingTimedOut = false,
  onCheckGradingAgain,
}) {
  const { attempt, questions: reviewQuestions } = review;
  // View-only state (reveal real answers / collapse cards). Scoring below is
  // untouched.
  const reviewState = useQuestionReviewState(
    reviewQuestions,
    canRevealRealAnswer,
  );
  // Each question's own marksPerCorrect (falling back to the paper's
  // default when a question doesn't override it - the same fallback
  // resolveQuestionMarks applies server-side at scoring time) summed
  // across every question, not just the ones actually attempted - this
  // is "how many marks the paper is out of", the same meaning maxMarks
  // has always had here.
  //
  // The previous version used totalQuestions * attempt.marksPerCorrect,
  // which assumed one uniform per-question mark value for the whole
  // paper. That was already wrong for any paper where an individual
  // question overrides marksPerCorrect, and became wrong far more often
  // once written-answer questions existed alongside MCQ ones on the same
  // paper, since a short/long-answer question is graded out of its own
  // marksPerCorrect just like any other question type - there's no
  // separate "written-answer max marks" concept to account for.
  const maxMarks = reviewQuestions.reduce((sum, rq) => {
    const perQuestion = Number(rq.marksPerCorrect ?? attempt.marksPerCorrect);
    return sum + (Number.isFinite(perQuestion) ? perQuestion : 0);
  }, 0) || null;
  const percentage =
    maxMarks != null
      ? Math.max(0, Math.round((Number(attempt.score) / maxMarks) * 100))
      : attempt.totalQuestions
        ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
        : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2 md:p-6 font-sans">
      <div className="w-full max-w-5xl space-y-6">
        <div className="surface-card rounded-3xl p-2  md:p-6 border border-border text-center">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
            {guestName ? `Well done, ${guestName}!` : "Session Complete!"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {attempt.mockTestName || session?.mockTest?.name}
          </p>
          <div className="text-6xl font-black mb-2 bg-linear-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            {percentage}%
          </div>
          <p className="text-muted-foreground text-sm font-normal mb-1">
            {attempt.correctCount} / {attempt.totalQuestions} correct
          </p>
          <p className="text-muted-foreground text-xs font-normal mb-8">
            Score: {attempt.score}
            {maxMarks != null ? ` / ${maxMarks}` : ""} marks
            (negative marking applied)
          </p>

          {pendingGradingCount > 0 && !gradingTimedOut && (
            <div className="flex items-center gap-2.5 mb-8 px-4 py-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs sm:text-sm font-medium text-left">
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              Grading {pendingGradingCount} written{" "}
              {pendingGradingCount === 1 ? "answer" : "answers"} with AI - your
              score above will update automatically once{" "}
              {pendingGradingCount === 1 ? "it's" : "they're"} done.
            </div>
          )}
          {pendingGradingCount > 0 && gradingTimedOut && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 px-4 py-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-left">
              <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                Still grading {pendingGradingCount} written{" "}
                {pendingGradingCount === 1 ? "answer" : "answers"} - this is
                taking longer than usual. Check again shortly.
              </p>
              <button
                onClick={onCheckGradingAgain}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl text-xs sm:text-sm shrink-0"
              >
                Check again
              </button>
            </div>
          )}

          {showSaveResultBanner && claimStatus !== "saved" && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 px-4 py-3.5 rounded-2xl border border-orange-500/20 bg-orange-500/10 text-left">
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Want to keep this result? Log in to save it to your account.
              </p>
              <button
                onClick={onSaveResult}
                disabled={claimStatus === "claiming"}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium rounded-xl text-xs sm:text-sm shrink-0 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                {claimStatus === "claiming" ? "Saving…" : saveLabel}
              </button>
            </div>
          )}
          {claimStatus === "saved" && (
            <div className="flex items-center gap-2 mb-8 px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs sm:text-sm font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" /> Saved to your account
              - you'll find it in My Results.
            </div>
          )}
          {claimStatus === "error" && (
            <div className="flex items-center gap-2 mb-8 px-4 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs sm:text-sm font-medium">
              <XCircle className="w-4 h-4 shrink-0" /> Couldn't save this result
              - the link may have expired.
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                label: "Correct",
                value: attempt.correctCount,
                color:
                  "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
              },
              {
                label: "Wrong",
                value: attempt.wrongCount,
                color: "bg-red-500/10 text-red-500 border border-red-500/20",
              },
              {
                label: "Skipped",
                value: attempt.unattemptedCount,
                color: "bg-muted text-muted-foreground border border-border",
              },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="text-left mb-8">
            <ReviewToolbar
              {...reviewState.toolbarProps}
              sticky
              className="mb-3"
            />
            <div className="space-y-3">
            {reviewQuestions.map((rq, questionIndex) => {
              const questionNumber = questionIndex + 1;
              const collapsed = reviewState.isCollapsed(rq.questionId);
              const revealed = reviewState.isRevealed(rq.questionId);
              const contentId = `session-question-${rq.questionId}`;
              const isPendingGrading = rq.gradingStatus === "pending_grading";
              const outcome = isPendingGrading ? null : getAnswerOutcome(rq);

              let cardClass;
              let statusIcon;
              if (isPendingGrading) {
                // Neutral, not the "positive" green isWrittenQuestion would
                // otherwise give an answered-but-ungraded question -
                // there's no outcome to show yet, so nothing here should
                // look like one.
                cardClass = "bg-card border-border";
                statusIcon = (
                  <Loader2 className="w-4 h-4 text-sky-500 mt-0.5 shrink-0 animate-spin" />
                );
              } else if (outcome === "positive") {
                cardClass = "bg-emerald-500/10 border-emerald-500/30";
                statusIcon = (
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                );
              } else if (outcome === "skipped") {
                cardClass = "bg-card border-border";
                statusIcon = (
                  <span className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0 block" />
                );
              } else {
                cardClass = "bg-red-500/10 border-red-500/30";
                statusIcon = (
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                );
              }

              let marksBadgeClass;
              if (rq.marksAwarded > 0) {
                marksBadgeClass =
                  "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
              } else if (rq.marksAwarded < 0) {
                marksBadgeClass =
                  "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
              } else {
                marksBadgeClass =
                  "text-muted-foreground bg-muted border-border";
              }

              return (
                <div
                  key={rq.questionId}
                  className={`p-2 md:p-4 rounded-2xl border text-sm ${cardClass}`}
                >
                  <div className="flex items-start gap-2">
                    {statusIcon}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <QuestionNumberChip number={questionNumber} />
                        {rq.topic && (
                          <span className="text-[11px] font-normal text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                            {rq.topic}
                          </span>
                        )}
                        {rq.subtopic && (
                          <span className="text-[11px] font-normal text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                            {rq.subtopic}
                          </span>
                        )}
                        {isPendingGrading ? (
                          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                            Grading…
                          </span>
                        ) : (
                          rq.marksAwarded !== undefined &&
                          rq.marksAwarded !== null && (
                            <span
                              className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full border ${marksBadgeClass}`}
                            >
                              {rq.marksAwarded > 0
                                ? `+${rq.marksAwarded}`
                                : `${rq.marksAwarded}`}
                              {rq.marksPerCorrect != null
                                ? ` / ${rq.marksPerCorrect}`
                                : attempt.marksPerCorrect != null
                                  ? ` / ${attempt.marksPerCorrect}`
                                  : ""}{" "}
                              marks
                            </span>
                          )
                        )}
                        <QuestionCardControls
                          className="ml-auto"
                          number={questionNumber}
                          collapsed={collapsed}
                          onToggleCollapse={() =>
                            reviewState.toggleCollapse(rq.questionId)
                          }
                          revealed={revealed}
                          onToggleReveal={() =>
                            reviewState.toggleReveal(rq.questionId)
                          }
                          canReveal={canRevealRealAnswer(rq)}
                          contentId={contentId}
                        />
                      </div>
                      {collapsed && <CollapsedPreview question={rq} />}
                      <AnimatedBlock open={!collapsed} id={contentId}>
                        <div className="pt-1.5">
                          <DiagramAssetsProvider assets={rq.diagramAssets}>
                            <QuestionContent
                              text={rq.text}
                              passage={rq.passage}
                              textClassName="text-sm font-normal text-foreground leading-relaxed"
                            />
                            {isPendingGrading ? (
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                Grading your answer with AI…
                              </div>
                            ) : (
                              <>
                                <QuestionAnswerReview
                                  question={rq}
                                  showRealAnswer={revealed}
                                />
                                <QuestionRealAnswer
                                  question={rq}
                                  open={revealed}
                                />
                              </>
                            )}
                          </DiagramAssetsProvider>
                        </div>
                      </AnimatedBlock>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            {isGuest ? (
              <a
                href="/"
                className="flex items-center gap-2 px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl shadow-xs transition-all text-sm"
              >
                Try MockCraft free →
              </a>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground font-semibold rounded-md hover:bg-muted transition-all text-sm"
                >
                  <Home className="w-4 h-4 text-orange-500" /> Dashboard
                </Link>
                <Link
                  to="/clusters"
                  className="flex items-center gap-2 px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-md shadow-xs transition-all text-sm"
                >
                  View Clusters
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
