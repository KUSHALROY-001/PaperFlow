import { CheckCircle2, Circle, FileText, Sparkles, Zap } from "lucide-react";

function PhaseCard({ phase }) {
  return (
    <div className="rounded-3xl p-5 card-lavender">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
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
          let icon = <Circle className="h-4 w-4 text-slate-300" />;

          if (step.status === "complete") {
            icon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
          } else if (step.status === "active") {
            icon = (
              <div className="pulse-violet flex h-4 w-4 items-center justify-center rounded-full bg-violet-100">
                <Zap className="h-2.5 w-2.5 text-violet-600" />
              </div>
            );
          }

          return (
            <div key={step.label} className="flex items-center gap-3">
              {icon}
              <span className="text-sm text-muted-foreground">{step.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-white/10">
        <div className="shimmer h-full w-3/4 rounded-full" />
      </div>
    </div>
  );
}

export default function ProcessingTab({ phases, documentPreview, job }) {
  const progress = Number(job?.progress_percent || 0);
  const statusLabel = job?.status ? job.status.replace("_", " ") : "idle";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-5 card-lavender">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-foreground">Live Processing Status</h3>
            <p className="text-sm text-muted-foreground">
              {job?.current_stage || "No active processing job"}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold capitalize text-violet-700 dark:bg-white/5 dark:text-violet-200">
            {statusLabel}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-2 text-right text-xs font-semibold text-muted-foreground">
          {progress}%
        </div>
        {job?.error_message && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {job.error_message}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <PhaseCard phase={phases[0]} />
        <PhaseCard phase={phases[1]} />

        <div className="rounded-3xl p-6 card-lavender">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Document Preview</h3>
              <p className="text-xs text-muted-foreground">
                Live OCR cleanup snapshot
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Improving quality
          </div>
        </div>

        <div className="rounded-[24px] border border-violet-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-900/70">
          <div className="space-y-3 font-mono text-sm text-slate-600 dark:text-slate-300">
            {documentPreview.map((line, index) => (
              <div
                key={`${line}-${index}`}
                className={index === 0 ? "font-semibold text-slate-900 dark:text-white" : ""}
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
