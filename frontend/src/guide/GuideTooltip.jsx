import { X } from "lucide-react";

// react-joyride's `tooltipComponent` prop - see GuideAdapter.jsx. Styled
// with the same surface-card/border/orange-accent tokens the rest of the
// app uses (see CreateClusterModal.jsx, WorkspaceHeader.jsx) rather than
// Joyride's default look, so it reads as part of PaperFlow rather than a
// bolted-on widget.
export default function GuideTooltip({
  step,
  index,
  size,
  isLastStep,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  progress,
}) {
  const displayIndex = progress ? progress.index : index;
  const displaySize = progress ? progress.size : size;
  const displayIsLastStep = progress ? progress.isLastStep : isLastStep;
  return (
    <div
      {...tooltipProps}
      className="w-[300px] max-w-[90vw] rounded-2xl border border-border surface-card p-4 shadow-2xl font-inter"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {step.title && (
            <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
          )}
        </div>
        <button
          {...closeProps}
          onClick={progress?.onSkip ?? closeProps.onClick}
          aria-label="Close guide"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {step.content && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {step.content}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {displayIndex + 1} of {displaySize}
        </span>
        <div className="flex items-center gap-2">
          {displayIndex > 0 && (
            <button
              {...backProps}
              onClick={progress?.onBack ?? backProps.onClick}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted"
            >
              Back
            </button>
          )}
          <button
            {...skipProps}
            onClick={progress?.onSkip ?? skipProps.onClick}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted"
          >
            Skip
          </button>
          <button
            {...primaryProps}
            onClick={progress?.onNext ?? primaryProps.onClick}
            className="bg-black dark:bg-white text-white dark:text-black font-semibold hover:rounded-full rounded-md shadow-xs transition-all px-3 py-1.5 text-xs"
          >
            {displayIsLastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
