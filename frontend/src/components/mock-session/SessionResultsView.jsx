import { Link } from "react-router-dom";
import { CheckCircle, XCircle, BarChart2, Home, LogIn } from "lucide-react";
import { getOptionText } from "@/utils/mockTestHelpers";
import QuestionContent, {
  QuestionDiagram,
  QuestionExplanation,
} from "../shared/QuestionContent";
import MathText from "../shared/MathText";

export default function SessionResultsView({
  review,
  session,
  isGuest = false,
  guestName,
  showSaveResultBanner = false,
  onSaveResult,
  claimStatus = "idle",
  saveLabel = "Log in to save",
}) {
  const { attempt, questions: reviewQuestions } = review;
  const percentage = attempt.totalQuestions
    ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-5xl space-y-6">
        <div className="surface-card rounded-3xl p-8 border border-border text-center">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${percentage >= 70 ? "bg-emerald-500/15 border border-emerald-500/20" : "bg-amber-500/15 border border-amber-500/20"}`}
          >
            {percentage >= 70 ? (
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            ) : (
              <BarChart2 className="w-10 h-10 text-amber-500" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
            {guestName ? `Well done, ${guestName}!` : "Session Complete!"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {attempt.mockTestName || session?.mockTest?.name}
          </p>
          <div className="text-6xl font-black mb-2 bg-linear-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            {percentage}%
          </div>
          <p className="text-muted-foreground text-sm font-semibold mb-1">
            {attempt.correctCount} / {attempt.totalQuestions} correct
          </p>
          <p className="text-muted-foreground text-xs font-semibold mb-8">
            Score: {attempt.score} marks (negative marking applied)
          </p>

          {showSaveResultBanner && claimStatus !== "saved" && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 px-4 py-3.5 rounded-2xl border border-orange-500/20 bg-orange-500/10 text-left">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                Want to keep this result? Log in to save it to your account.
              </p>
              <button
                onClick={onSaveResult}
                disabled={claimStatus === "claiming"}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-xs sm:text-sm shrink-0 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                {claimStatus === "claiming" ? "Saving…" : saveLabel}
              </button>
            </div>
          )}
          {claimStatus === "saved" && (
            <div className="flex items-center gap-2 mb-8 px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs sm:text-sm font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0" /> Saved to your account
              - you'll find it in My Results.
            </div>
          )}
          {claimStatus === "error" && (
            <div className="flex items-center gap-2 mb-8 px-4 py-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs sm:text-sm font-semibold">
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
                <div className="text-xs font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-left mb-8">
            {reviewQuestions.map((rq) => {
              const skipped = rq.selectedOptionIndexes.length === 0;
              const correct = rq.isCorrect === true;
              return (
                <div
                  key={rq.questionId}
                  className={`p-4 rounded-2xl border text-sm ${correct ? "bg-emerald-500/10 border-emerald-500/30" : skipped ? "bg-card border-border" : "bg-red-500/10 border-red-500/30"}`}
                >
                  <div className="flex items-start gap-2">
                    {correct ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : skipped ? (
                      <span className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0 block" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      {(rq.topic || rq.subtopic) && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {rq.topic && (
                            <span className="text-[11px] font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                              {rq.topic}
                            </span>
                          )}
                          {rq.subtopic && (
                            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                              {rq.subtopic}
                            </span>
                          )}
                        </div>
                      )}
                      <QuestionContent
                        text={rq.text}
                        passage={rq.passage}
                        diagramUrl={rq.diagramUrl}
                        placement={rq.placement}
                        textClassName="font-bold text-foreground"
                      />
                      {!correct && !skipped && (
                        <p className="text-xs text-red-500 font-semibold mt-1">
                          Your answer:{" "}
                          <MathText
                            text={getOptionText(
                              rq.options,
                              rq.selectedOptionIndexes[0],
                            )}
                          />
                        </p>
                      )}
                      {!correct && rq.correctOptionIndexes?.length > 0 && (
                        <p className="text-xs text-emerald-500 font-semibold mt-0.5">
                          Correct:{" "}
                          {rq.correctOptionIndexes.map((i, idx) => (
                            <span key={i}>
                              {idx > 0 && ", "}
                              <MathText text={getOptionText(rq.options, i)} />
                            </span>
                          ))}
                        </p>
                      )}
                      {rq.placement === "below_options" && (
                        <div className="mt-2">
                          <QuestionDiagram diagramUrl={rq.diagramUrl} />
                        </div>
                      )}
                      <QuestionExplanation explanation={rq.explanation} />
                    </div>
                  </div>
                </div>
              );
            })}
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
                  className="flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted transition-all text-sm"
                >
                  <Home className="w-4 h-4 text-orange-500" /> Dashboard
                </Link>
                <Link
                  to="/clusters"
                  className="flex items-center gap-2 px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl shadow-xs transition-all text-sm"
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
