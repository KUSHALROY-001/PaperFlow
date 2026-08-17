import { Loader2, AlertTriangle, Copy } from "lucide-react";
import { useDuplicates } from "@/hooks/useDuplicates";
import DuplicatePairCard from "../components/duplicates/DuplicatePairCard";

export default function Duplicates() {
  const { pairs, loading, loadError, resolvingId, resolveError, resolve } =
    useDuplicates();

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading duplicate
        questions…
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
    <div className="p-2 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
          <Copy className="w-5 h-5 text-orange-500" /> Duplicate Questions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Questions that look similar across different mock tests - review each
          pair and keep the better version, or dismiss if they're actually
          different questions.
        </p>
      </div>

      {resolveError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {resolveError}
        </div>
      )}

      {pairs.length === 0 ? (
        <div className="surface-card rounded-2xl p-10 border border-border text-center text-muted-foreground text-sm">
          No duplicate questions to review right now.
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair) => (
            <DuplicatePairCard
              key={pair.id}
              pair={pair}
              onResolve={resolve}
              isResolving={resolvingId === pair.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
