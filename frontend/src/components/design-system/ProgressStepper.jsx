import { Check, Circle, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

const statusStyles = {
  complete: "border-success bg-success text-success-foreground",
  active: "border-primary bg-primary text-primary-foreground",
  error: "border-error bg-error text-error-foreground",
  pending: "border-border bg-background text-muted-foreground",
};

const statusIcons = {
  complete: Check,
  active: Loader2,
  error: X,
  pending: Circle,
};

function ProgressStepper({ steps = [], className, orientation = "vertical" }) {
  const isHorizontal = orientation === "horizontal";

  return (
    <ol
      className={cn(
        isHorizontal
          ? "grid gap-3 sm:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]"
          : "space-y-4",
        className,
      )}
      style={{ "--step-count": Math.max(steps.length, 1) }}
    >
      {steps.map((step, index) => {
        const status = step.status || "pending";
        const Icon = statusIcons[status] || Circle;

        return (
          <li
            key={step.id || step.label || index}
            className="relative flex gap-3"
          >
            {!isHorizontal && index < steps.length - 1 ? (
              <span className="absolute left-4 top-9 h-[calc(100%-12px)] w-px bg-border" />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                statusStyles[status],
              )}
            >
              <Icon
                className={cn("h-4 w-4", status === "active" && "animate-spin")}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {step.label}
              </span>
              {step.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {step.description}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export { ProgressStepper };
