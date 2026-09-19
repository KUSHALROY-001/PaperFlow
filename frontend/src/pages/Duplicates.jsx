import { useMemo, useState } from "react";
import { AlertTriangle, Copy, SlidersHorizontal } from "lucide-react";
import { useDuplicates } from "@/hooks/useDuplicates";
import DuplicateGroupCard from "../components/duplicates/DuplicateGroupCard";
import DuplicatesIntroCard from "../components/duplicates/DuplicatesIntroCard";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors DuplicateGroupCard's real shape - a grid of member-question
// cards under a header row - rather than a generic centered spinner, so
// the skeleton gives some sense of what's actually loading (a report, not
// a list of rows).
function DuplicateGroupCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[0, 1].map((member) => (
        <div
          key={member}
          className="flex-1 min-w-0 surface-card rounded-2xl border border-border p-4 sm:p-5"
        >
          <Skeleton className="h-3 w-40 mb-3" />
          <Skeleton className="h-5 w-24 rounded-full mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

const similarityFilters = [
  { id: "all", label: "All" },
  { id: "above90", label: "> 90%" },
  { id: "above80", label: "80-90%" },
  { id: "above70", label: "70-80%" },
  { id: "below70", label: "< 70%" },
];

function matchesSimilarityFilter(score, filter) {
  if (filter === "above90") return score > 0.9;
  if (filter === "above80") return score > 0.8 && score <= 0.9;
  if (filter === "above70") return score >= 0.7 && score <= 0.8;
  if (filter === "below70") return score < 0.7;
  return true;
}

export default function Duplicates() {
  const { groups, loading, loadError } = useDuplicates();
  const [similarityFilter, setSimilarityFilter] = useState("all");
  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        matchesSimilarityFilter(group.similarityScore, similarityFilter),
      ),
    [groups, similarityFilter],
  );

  if (loading) {
    return (
      <div className="p-2 sm:p-6 max-w-full mx-auto space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <DuplicateGroupCardSkeleton key={index} />
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
          Questions that look similar across different mock tests, grouped
          together so you can see exactly where each one repeats. This is a
          read-only report - nothing here needs a decision.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="surface-card rounded-2xl p-10 border border-border text-center text-muted-foreground text-sm">
          No duplicate questions found.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Similarity
            </span>
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
              {similarityFilters.map((filter) => {
                const isActive = similarityFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSimilarityFilter(filter.id)}
                    className={`min-w-16 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-black/90 dark:bg-white text-white dark:text-black shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="surface-card rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
              No duplicate groups match this similarity range.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <DuplicateGroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
