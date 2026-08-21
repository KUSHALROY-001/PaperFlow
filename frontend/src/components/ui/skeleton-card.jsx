import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonText } from "@/components/ui/skeleton-text";
import { cn } from "@/lib/utils";

// Matches surface-card's own look (index.css: bg var(--card), 1px
// var(--border), no shadow) so a grid of these sits flush against the
// real cards that replace them - a skeleton that doesn't match its
// eventual content's silhouette reads as a generic "loading" box, not a
// placeholder for THIS specific card.
export function SkeletonCard({ className, showIcon = true, lines = 2 }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 border border-border bg-card",
        className,
      )}
    >
      {showIcon && <Skeleton className="h-9 w-9 rounded-xl mb-3" />}
      <Skeleton className="h-4 w-3/4 mb-2" />
      <SkeletonText lines={lines} />
    </div>
  );
}
