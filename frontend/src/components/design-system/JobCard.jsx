import { RotateCcw } from "lucide-react";

import { StatusBadge } from "@/components/design-system/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusTone = {
  queued: "neutral",
  running: "primary",
  complete: "success",
  failed: "error",
};

function JobCard({
  title,
  step,
  startedAt,
  eta,
  progress = 0,
  status = "running",
  onRetry,
  className,
}) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <article
      className={cn("rounded-lg border bg-card p-4", className)}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{step}</p>
        </div>
        <StatusBadge tone={statusTone[status] || "neutral"} dot>
          {status}
        </StatusBadge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary",
            status === "failed" && "bg-error",
          )}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{startedAt}</span>
        <span className="number-mono">{eta}</span>
      </div>
      {status === "failed" && onRetry ? (
        <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}
    </article>
  );
}

export { JobCard };
