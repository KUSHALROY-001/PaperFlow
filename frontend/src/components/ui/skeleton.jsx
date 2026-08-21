import * as React from "react";

import { cn } from "@/lib/utils";

// Reuses the .shimmer utility already defined in index.css (the
// left-to-right gradient sweep over --muted/--accent, animated via the
// shared @keyframes shimmer + --motion-slow timing var) rather than
// inventing new CSS - every skeleton in the app inherits the same
// animation speed and theme-aware colors for free, and there's exactly
// one place to ever retune the shimmer's feel.
const Skeleton = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
});
Skeleton.displayName = "Skeleton";

export { Skeleton };
