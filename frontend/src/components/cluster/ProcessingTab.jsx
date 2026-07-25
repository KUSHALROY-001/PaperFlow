import { CheckCircle2, Circle, FileText, Sparkles, Zap } from "lucide-react";

function PhaseCard({ phase }) {
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

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-3/4 rounded-full bg-orange-500 animate-pulse" />
      </div>
    </div>
  );
}

export default function ProcessingTab({ phases, documentPreview, job }) {
  const progress = Number(job?.progress_percent || 0);
  const statusLabel = job?.status ? job.status.replace("_", " ") : "idle";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-5 surface-card border border-border">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-foreground">
              Live Processing Status
            </h3>
            <p className="text-sm text-muted-foreground">
              {job?.current_stage || "No active processing job"}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-orange-500/15 border border-orange-500/20 px-3 py-1 text-xs font-semibold capitalize text-orange-500">
            {statusLabel}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#ea580c] transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-2 text-right text-xs font-semibold text-muted-foreground">
          {progress}%
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
