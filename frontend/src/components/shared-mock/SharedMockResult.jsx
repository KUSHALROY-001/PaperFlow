import { CheckCircle, XCircle } from "lucide-react";

export default function SharedMockResult({ review, name, mockTestInfo }) {
  const { attempt, questions: reviewQuestions } = review;
  const percentage = attempt.totalQuestions
    ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-5">
        <div className="surface-card rounded-3xl p-8 text-center border border-border">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${percentage >= 70 ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/15 text-amber-500 border border-amber-500/20"}`}
          >
            {percentage >= 70 ? (
              <CheckCircle className="w-8 h-8" />
            ) : (
              <XCircle className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">
            Well done, {name}!
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mb-5">
            {mockTestInfo?.mockTest?.name}
          </p>
          <div className="text-6xl font-black mb-1 text-orange-500">
            {percentage}%
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            {attempt.correctCount} / {attempt.totalQuestions} correct
          </p>
          <p className="text-muted-foreground text-xs font-medium mt-1">
            Score: {attempt.score} marks
          </p>
        </div>

        <div className="surface-card rounded-3xl p-6 border border-border space-y-3">
          <h3 className="font-bold text-foreground text-sm">Answer Review</h3>
          {reviewQuestions.map((rq) => {
            const skipped = rq.selectedOptionIndexes.length === 0;
            const correct = rq.isCorrect === true;
            return (
              <div
                key={rq.questionId}
                className={`p-3 rounded-xl text-sm border ${correct ? "bg-emerald-500/10 border-emerald-500/30" : skipped ? "bg-card border-border" : "bg-red-500/10 border-red-500/30"}`}
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
                    <p className="font-bold text-foreground text-xs">
                      {rq.text}
                    </p>
                    {!correct && !skipped && (
                      <p className="text-xs text-red-500 mt-0.5 font-semibold">
                        Your answer: {rq.options[rq.selectedOptionIndexes[0]]}
                      </p>
                    )}
                    {!correct && rq.correctOptionIndexes?.length > 0 && (
                      <p className="text-xs text-emerald-500 font-semibold">
                        Correct:{" "}
                        {rq.correctOptionIndexes
                          .map((i) => rq.options[i])
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Want to create your own mock tests?{" "}
            <a href="/" className="text-orange-500 font-bold hover:underline">
              Try MockCraft free →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
