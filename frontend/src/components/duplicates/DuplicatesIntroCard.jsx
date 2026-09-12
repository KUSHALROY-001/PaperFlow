import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info, X, Layers, Eye } from "lucide-react";

// Exported so anything that wants to "bring the intro card back" (e.g.
// the info button next to Duplicates in AppShell.jsx's sidebar) clears
// the exact same key this card checks - a duplicated string literal in
// two files is a silent-drift bug waiting to happen.
export const DUPLICATES_INTRO_DISMISS_KEY =
  "paperflow_duplicates_intro_dismissed";

export default function DuplicatesIntroCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DUPLICATES_INTRO_DISMISS_KEY) === "1",
  );

  // A mount-only localStorage read (the useState initializer above) is
  // NOT enough on its own: clicking the sidebar's info button while
  // already sitting on /duplicates navigates to the same route, so this
  // component never remounts and never re-runs that initializer, even
  // though AppShell.jsx already cleared the key. ?showInfo=1 in the URL
  // is a real, reactive signal instead - navigating to it (same path or
  // not) always changes the URL, which this effect can watch for. The
  // param is stripped right after so it doesn't linger on refresh/back.
  useEffect(() => {
    if (searchParams.get("showInfo") === "1") {
      localStorage.removeItem(DUPLICATES_INTRO_DISMISS_KEY);
      setDismissed(false);
      const next = new URLSearchParams(searchParams);
      next.delete("showInfo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DUPLICATES_INTRO_DISMISS_KEY, "1");
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
        A background job compares question text across every upload in your
        workspace and flags questions that look like the same one extracted
        more than once - common when a topic bank gets reused year over
        year, or the same PDF is processed into two different mock tests.
        This page is a report, not a queue - there's nothing to act on here.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div className="flex gap-2.5">
          <Layers className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">
              Grouped, Not Paired
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              A question reused across several mock tests shows up as one
              group with every mock test it appears in, not separate
              side-by-side pairs.
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Eye className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">
              Read-Only
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              This is purely informational - questions here aren't merged
              or changed by viewing this page.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
