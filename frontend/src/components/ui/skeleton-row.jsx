import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// A single list/table row shape - repeat this ~5-8 times to fill a
// typical viewport (see the implementation plan's Phase 2 note: enough
// rows that the loading state doesn't look sparse, but not so many it's
// clearly padding). Used by QuestionBank/ReviewQueue/Duplicates-style
// list views rather than SkeletonCard's grid-item shape.
export function SkeletonRow({ className, showAvatar = false }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border last:border-b-0",
        className,
      )}
    >
      {showAvatar && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full shrink-0" />
    </div>
  );
}

// The repeated-rows wrapper itself, so callers don't each re-implement
// "map an array of N over SkeletonRow" - one place to change the default
// count if 6 turns out to be the wrong number in practice.
export function SkeletonRowList({ count = 6, className, showAvatar = false }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonRow key={index} showAvatar={showAvatar} />
      ))}
    </div>
  );
}
