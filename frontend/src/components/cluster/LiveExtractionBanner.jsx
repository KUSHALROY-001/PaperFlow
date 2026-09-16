import { Loader2 } from "lucide-react";

/**
 * Shown above the Review / Output question lists while rows are still
 * arriving.
 *
 * Two genuinely different situations, deliberately worded differently:
 *
 *  - A job is running. The worker commits extracted questions in batches
 *    of 30, so what's on screen is a real, growing, partial extraction.
 *    There is no meaningful "of N" to show here - the final count isn't
 *    known until the job finishes - so this only reports how many have
 *    landed.
 *  - No job is running, but the client is still draining the pages of an
 *    already-finished extraction. Here the total IS known, so it shows
 *    progress against it.
 *
 * Collapsing these into one "loading" message would be misleading: the
 * first case means "more questions are being created right now", the
 * second means "all your questions exist, we're still fetching them".
 */
export default function LiveExtractionBanner({
  isProcessing = false,
  isStreaming = false,
  loadedCount = 0,
  totalCount = 0,
}) {
  if (!isProcessing && !isStreaming) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-3">
      {isProcessing ? (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
        </span>
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-500" />
      )}

      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isProcessing
            ? "Extracting questions..."
            : "Loading questions..."}
        </p>
        <p className="text-xs text-muted-foreground">
          {isProcessing
            ? `${loadedCount} saved so far - this list updates as extraction continues.`
            : `${loadedCount} of ${totalCount} loaded.`}
        </p>
      </div>
    </div>
  );
}
