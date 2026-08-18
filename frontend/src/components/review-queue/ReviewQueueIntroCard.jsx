import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info, X, ListTodo, SlidersHorizontal, Layers } from "lucide-react";

// Exported so anything that wants to "bring the intro card back" (e.g.
// the info button next to Review Queue in AppShell.jsx's sidebar) clears
// the exact same key this card checks - a duplicated string literal in
// two files is a silent-drift bug waiting to happen.
export const REVIEW_QUEUE_INTRO_DISMISS_KEY =
  "paperflow_review_queue_intro_dismissed";

export default function ReviewQueueIntroCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(REVIEW_QUEUE_INTRO_DISMISS_KEY) === "1",
  );

  // A mount-only localStorage read (the useState initializer above) is
  // NOT enough on its own: clicking the sidebar's info button while
  // already sitting on /review-queue navigates to the same route, so this
  // component never remounts and never re-runs that initializer, even
  // though AppShell.jsx already cleared the key. ?showInfo=1 in the URL
  // is a real, reactive signal instead - navigating to it (same path or
  // not) always changes the URL, which this effect can watch for. The
  // param is stripped right after so it doesn't linger on refresh/back.
  useEffect(() => {
    if (searchParams.get("showInfo") === "1") {
      localStorage.removeItem(REVIEW_QUEUE_INTRO_DISMISS_KEY);
      setDismissed(false);
      const next = new URLSearchParams(searchParams);
      next.delete("showInfo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(REVIEW_QUEUE_INTRO_DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="surface-card rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-foreground">
            What is this page?
          </h2>
        </div>
        <button
          onClick={handleDismiss}
          title="Dismiss"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground mt-3 leading-relaxed">
        Every extracted question the AI wasn't fully confident about lands
        here as "needs review," pulled from across all your clusters into
        one inbox - so you're not stuck opening one mock test's review tab
        at a time to clear a backlog.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div className="flex gap-2.5">
          <ListTodo className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">
              Focus Mode
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Work one question at a time, lowest-confidence first, and
              approve or reject with a keyboard shortcut.
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Layers className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">
              List Mode
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Switch to multi-select to bulk-approve a batch of obviously
              fine questions at once.
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">
              Filter & Sort
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Narrow to one cluster, a confidence threshold, or AI-flagged
              questions, and sort by confidence or recency.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
