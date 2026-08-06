import { Loader2, AlertTriangle } from "lucide-react";
import { useMyResults } from "@/hooks/useMyResults";
import ResultsHeader from "../components/my-results/ResultsHeader";
import ResultsSummaryRow from "../components/my-results/ResultsSummaryRow";
import ScoreTrendStrip from "../components/my-results/ScoreTrendStrip";
import ResultsFilterTabs from "../components/my-results/ResultsFilterTabs";
import AttemptCard from "../components/my-results/AttemptCard";

export default function MyResults() {
  const {
    filter,
    setFilter,
    loading,
    loadError,
    submittedAttempts,
    totalAttempts,
    avgScore,
    best,
    filtered,
    removeAttempt,
  } = useMyResults();

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading your results…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="surface-card rounded-2xl border border-border p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-4xl mx-auto space-y-6">
      <ResultsHeader />

      <ResultsSummaryRow
        totalAttempts={totalAttempts}
        avgScore={avgScore}
        best={best}
      />

      <ScoreTrendStrip submittedAttempts={submittedAttempts} />

      <ResultsFilterTabs filter={filter} setFilter={setFilter} />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="surface-card rounded-2xl p-10 border border-border text-center text-muted-foreground text-sm">
            {totalAttempts === 0
              ? "You haven't taken any mock tests yet."
              : "No attempts match this filter."}
          </div>
        ) : (
          filtered.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              onDeleteAttempt={removeAttempt}
            />
          ))
        )}
      </div>
    </div>
  );
}
