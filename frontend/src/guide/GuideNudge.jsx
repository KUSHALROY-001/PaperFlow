import { CheckCircle2, X } from "lucide-react";

// Shown when GuideProvider detects (via a background query subscription -
// see GuideProvider.jsx's "background watch for a parked processing
// chapter" effect) that an extraction job finished while the person had
// already navigated away from the mock test page. Never appears while
// the processing chapter's own "wait" step is actively on screen - that
// case advances on its own once the query cache updates, per the
// `processing` chapter's `wait` step.
export default function GuideNudge({ onContinue, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[1999] w-[280px] rounded-2xl border border-border surface-card p-4 shadow-2xl font-inter">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">
            Extraction finished
          </h3>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Your mock test's questions are ready to review.
      </p>
      <button
        onClick={onContinue}
        className="mt-3 w-full rounded-md bg-orange-500 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
      >
        Continue the tour
      </button>
    </div>
  );
}
