import {
  AlertCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";
import ProcessingTimeline from "./ProcessingTimeline";

export default function ProcessingTab({
  steps,
  documentPreview,
  job,
  isGenerated = false,
}) {
  const progress = Number(job?.progress_percent || 0);
  const statusLabel = job?.status ? job.status.replace("_", " ") : "idle";
  const isProcessing =
    !job?.status || ["queued", "running", "processing"].includes(job?.status);

  let statusBadgeClass;
  if (job?.status === "completed") {
    statusBadgeClass = "bg-emerald-500/15 border-emerald-500/30 text-emerald-500";
  } else if (job?.status === "failed") {
    statusBadgeClass = "bg-red-500/15 border-red-500/30 text-red-500";
  } else {
    statusBadgeClass = "bg-orange-500/15 border-orange-500/30 text-orange-500";
  }

  let progressLabel;
  if (!isProcessing) {
    progressLabel = "Status";
  } else if (isGenerated) {
    progressLabel = "Generating questions with AI...";
  } else {
    progressLabel = "Extracting & processing PDF...";
  }

  return (
    <div className="space-y-6 font-inter">
      <div className="rounded-3xl p-5 sm:p-6 surface-card border border-border">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-foreground text-base sm:text-lg flex items-center gap-2">
              Live Processing Status
              {isProcessing && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {job?.current_stage || "No active processing job"}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize border ${statusBadgeClass}`}
          >
            {isProcessing && (
              <Zap className="h-3 w-3 animate-pulse text-orange-500 fill-orange-500" />
            )}
            {statusLabel}
          </span>
        </div>

        {/* Live Sliding Animated Progress Bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/80 border border-border/50 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-xs ${
              job?.status === "completed"
                ? "bg-emerald-500"
                : "bg-linear-to-r from-[#ea580c] via-orange-500 to-amber-500"
            }`}
            style={{
              width: `${Math.min(Math.max(progress, isProcessing ? 6 : 0), 100)}%`,
            }}
          >
            {/* Sliding Sheen Light Beam across filled progress */}
            {isProcessing && (
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent animate-progress-shine" />
            )}
          </div>

          {/* Indeterminate Sliding Pulse when starting at 0% */}
          {isProcessing && progress === 0 && (
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-transparent via-orange-500/60 to-transparent animate-progress-indeterminate" />
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{progressLabel}</span>
          <span className="font-bold text-foreground font-mono">
            {progress}%
          </span>
        </div>

        {job?.error_message && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {job.error_message}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ProcessingTimeline steps={steps} />

        <div className="rounded-3xl p-4 sm:p-6 surface-card border border-border">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
                {isGenerated ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">
                  {isGenerated ? "Generation Progress" : "Document Preview"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isGenerated
                    ? "Live AI generation snapshot"
                    : "Live OCR cleanup snapshot"}
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
              <Sparkles className="h-3.5 w-3.5" />
              {isGenerated ? "AI-generated" : "Improving quality"}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-muted/40 p-5">
            <div className="space-y-3 font-mono text-xs text-muted-foreground">
              {documentPreview.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className={index === 0 ? "font-bold text-foreground" : ""}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
