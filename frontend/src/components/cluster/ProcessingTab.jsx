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

export default function ProcessingTab({ phases, documentPreview }) {
  return (
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
  );
}
