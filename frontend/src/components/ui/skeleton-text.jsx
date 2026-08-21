import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// A run of shimmer lines mimicking paragraph/label text - the last line
// is narrower by default (60%) since real wrapped text almost never
// fills its last line edge-to-edge, and a full-width final line reads as
// visibly "off" once you've seen the real content next to it.
export function SkeletonText({ lines = 1, className, lastLineWidth = "60%" }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-3.5 w-full"
          style={
            index === lines - 1 && lines > 1
              ? { width: lastLineWidth }
              : undefined
          }
        />
      ))}
    </div>
  );
}
