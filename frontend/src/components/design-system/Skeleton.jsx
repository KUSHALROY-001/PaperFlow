import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

function SkeletonCard({ className }) {
  return (
    <div className={cn("rounded-lg border bg-card p-5", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-8 w-16" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  );
}

export { Skeleton, SkeletonCard };
