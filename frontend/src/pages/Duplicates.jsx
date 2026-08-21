import { AlertTriangle, Copy } from "lucide-react";
import { useDuplicates } from "@/hooks/useDuplicates";
import DuplicatePairCard from "../components/duplicates/DuplicatePairCard";
import DuplicatesIntroCard from "../components/duplicates/DuplicatesIntroCard";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors DuplicatePairCard's real two-sides-side-by-side layout - a
// generic centered spinner gave no sense of what's actually loading here
// (a comparison, not a list), so the skeleton mimics that shape directly.
function DuplicatePairCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {[0, 1].map((side) => (
        <div
          key={side}
          className="flex-1 min-w-0 surface-card rounded-2xl border border-border p-4 sm:p-5"
        >
          <Skeleton className="h-3 w-40 mb-3" />
          <Skeleton className="h-5 w-24 rounded-full mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl mt-4" />
        </div>
      ))}
    </div>
  );
}

export default function Duplicates() {
  const { pairs, loading, loadError, resolvingId, resolveError, resolve } =
    useDuplicates();

  if (loading) {
    return (
      <div className="p-2 sm:p-6 max-w-full mx-auto space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <DuplicatePairCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-full mx-auto">
        <div className="surface-card rounded-2xl border border-border p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-6 max-w-full mx-auto space-y-5">
      <DuplicatesIntroCard />

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
