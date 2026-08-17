import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info, X, Mail, Users2, AlertTriangle } from "lucide-react";

// Exported so anything that wants to "bring the intro card back" (e.g.
// the info button next to Students in AppShell.jsx's sidebar) clears the
// exact same key this card checks - a duplicated string literal in two
// files is a silent-drift bug waiting to happen.
export const STUDENTS_INTRO_DISMISS_KEY = "paperflow_students_intro_dismissed";

export default function StudentsIntroCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STUDENTS_INTRO_DISMISS_KEY) === "1",
  );

  // A mount-only localStorage read (the useState initializer above) is
  // NOT enough on its own: clicking the sidebar's info button while
  // already sitting on /students navigates to the same route, so this
  // component never remounts and never re-runs that initializer, even
  // though AppShell.jsx already cleared the key. ?showInfo=1 in the URL
  // is a real, reactive signal instead - navigating to it (same path or
  // not) always changes the URL, which this effect can watch for. The
  // param is stripped right after so it doesn't linger on refresh/back.
  useEffect(() => {
    if (searchParams.get("showInfo") === "1") {
      localStorage.removeItem(STUDENTS_INTRO_DISMISS_KEY);
      setDismissed(false);
      const next = new URLSearchParams(searchParams);
      next.delete("showInfo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STUDENTS_INTRO_DISMISS_KEY, "1");
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
        This page tracks everyone who has taken one of your mock tests through a
        shared link. Since taking a test only requires a name and email — no
        login — this is the closest thing PaperFlow has to a student roster,
        built automatically from every submitted attempt.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div className="flex gap-2.5">
          <Mail className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">
              Roster & History
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Browse every test-taker, search by name or email, and open
              anyone's full attempt history and per-topic accuracy.
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Users2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">Cohorts</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Group students into named batches to filter the roster and see one
              aggregate average score per batch.
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-foreground">Weak Topics</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              See which topics the most students are struggling with, and copy a
              practice link scoped to just that topic.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
