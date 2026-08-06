import { CheckCircle2, Circle, FileText, Sparkles, Zap } from "lucide-react";

function PhaseCard({ phase }) {
  const isRunning = phase?.steps?.some((step) => step.status === "active");
  const isComplete = phase?.steps?.every((step) => step.status === "complete");

  return (
    <div className="rounded-3xl p-4 sm:p-5 surface-card border border-border">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
          <phase.icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">{phase.title}</h3>
          <p className="text-xs text-muted-foreground">
            Structured cleanup and confidence scoring
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {phase.steps.map((step) => {
          let icon = <Circle className="h-4 w-4 text-muted-foreground/40" />;

          if (step.status === "complete") {
            icon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
          } else if (step.status === "active") {
            icon = (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500/20 animate-pulse">
                <Zap className="h-2.5 w-2.5 text-orange-500 fill-orange-500" />
              </div>
            );
          }

          return (
            <div key={step.label} className="flex items-center gap-3">
              {icon}
              <span className="text-sm text-muted-foreground font-medium">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted/80 border border-border/40 relative">
        <div
          className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
            isComplete
              ? "w-full bg-emerald-500"
              : isRunning
                ? "w-3/4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500"
                : "w-0 bg-muted-foreground/20"
          }`}
        >
          {isRunning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-progress-shine" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProcessingTab({ phases, documentPreview, job }) {
  const progress = Number(job?.progress_percent || 0);
  const statusLabel = job?.status ? job.status.replace("_", " ") : "idle";
  const isProcessing =
    !job?.status ||
    ["queued", "running", "processing"].includes(job?.status);

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
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize border ${
              job?.status === "completed"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
                : job?.status === "failed"
                  ? "bg-red-500/15 border-red-500/30 text-red-500"
                  : "bg-orange-500/15 border-orange-500/30 text-orange-500"
            }`}
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
                : "bg-gradient-to-r from-[#ea580c] via-orange-500 to-amber-500"
            }`}
            style={{
              width: `${Math.min(Math.max(progress, isProcessing ? 6 : 0), 100)}%`,
            }}
          >
            {/* Sliding Sheen Light Beam across filled progress */}
            {isProcessing && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-progress-shine" />
            )}
          </div>

          {/* Indeterminate Sliding Pulse when starting at 0% */}
          {isProcessing && progress === 0 && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-orange-500/60 to-transparent animate-progress-indeterminate" />
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{isProcessing ? "Extracting & processing PDF..." : "Status"}</span>
          <span className="font-bold text-foreground font-mono">{progress}%</span>
        </div>

        {job?.error_message && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {job.error_message}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <PhaseCard phase={phases[0]} />
        <PhaseCard phase={phases[1]} />

        <div className="rounded-3xl p-4 sm:p-6 surface-card border border-border">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">Document Preview</h3>
                <p className="text-xs text-muted-foreground">
                  Live OCR cleanup snapshot
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
              <Sparkles className="h-3.5 w-3.5" />
              Improving quality
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-muted/40 p-5">
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
