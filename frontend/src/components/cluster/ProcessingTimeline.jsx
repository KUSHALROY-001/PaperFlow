import { Check, Loader2 } from "lucide-react";

// complete: solid emerald circle + check, solid connector down to the
// next step, "Completed" badge - matches the reference design's green
// state. active: orange (this app's actual accent - the reference image
// used blue, but nothing else here does, so orange keeps this consistent
// with the progress bar/badges directly above it) circle with a spinner,
// highlighted row background, "Processing" badge. pending: muted/outline
// circle, dimmed text, no badge at all (an upcoming step has no status
// worth a pill yet).
const STATUS_STYLES = {
  complete: {
    circle: "bg-emerald-500 text-white",
    connector: "bg-emerald-500",
    row: "",
    label: "text-foreground",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    badgeText: "Completed",
  },
  active: {
    circle: "bg-orange-500 text-white",
    connector: "bg-border",
    row: "bg-orange-500/5 border border-orange-500/20",
    label: "text-orange-600",
    badge: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    badgeText: "Processing",
  },
  pending: {
    circle: "bg-muted text-muted-foreground/50 border border-border",
    connector: "bg-border",
    row: "",
    label: "text-muted-foreground",
    badge: null,
    badgeText: null,
  },
};

export default function ProcessingTimeline({ steps }) {
  return (
    <div className="rounded-3xl surface-card border border-border p-4 sm:p-5">
      <ol>
        {steps.map((step, index) => {
          const style = STATUS_STYLES[step.status] || STATUS_STYLES.pending;
          const isLast = index === steps.length - 1;
          const Icon = step.icon;

          let stepIcon;
          if (step.status === "active") {
            stepIcon = <Loader2 className="h-4 w-4 animate-spin" />;
          } else if (step.status === "complete") {
            stepIcon = <Check className="h-4 w-4" strokeWidth={3} />;
          } else {
            stepIcon = <Icon className="h-4 w-4" />;
          }

          return (
            <li key={step.label} className="relative flex gap-4">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-5 top-10 bottom-0 w-0.5 ${style.connector}`}
                />
              )}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.circle}`}
              >
                {stepIcon}
              </div>
              <div
                className={`flex flex-1 flex-col gap-2 rounded-2xl px-3 py-2.5 mb-4 sm:flex-row sm:items-center sm:justify-between ${style.row}`}
              >
                <div>
                  <p className={`text-sm font-bold ${style.label}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
                {style.badge && (
                  <span
                    className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${style.badge}`}
                  >
                    {step.status === "complete" ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {style.badgeText}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
