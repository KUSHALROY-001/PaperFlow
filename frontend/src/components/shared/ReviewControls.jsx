import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { getQuestionPreview } from "@/lib/reviewControls";

const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-md border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed";

/** "Q3" chip so a collapsed card is still identifiable. */
export function QuestionNumberChip({ number }) {
  return (
    <span className="text-[11px] font-bold tabular-nums bg-black/90 dark:bg-white text-white dark:text-black px-2 py-0.5 rounded-full shadow-xs">
      Q{number}
    </span>
  );
}

/** One-line truncated question text shown under the header when collapsed. */
export function CollapsedPreview({ question }) {
  const preview = getQuestionPreview(question);
  if (!preview) return null;
  return (
    <p className="mt-1.5 text-xs text-muted-foreground truncate">{preview}</p>
  );
}

/**
 * Per-question actions for the card header: collapse/expand and
 * show/hide real answer. The reveal button is omitted while collapsed (its
 * content is hidden anyway) and for questions with nothing to reveal.
 */
export function QuestionCardControls({
  number,
  collapsed,
  onToggleCollapse,
  revealed,
  onToggleReveal,
  canReveal,
  contentId,
  className = "",
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {canReveal && !collapsed && (
        <button
          type="button"
          onClick={onToggleReveal}
          aria-pressed={revealed}
          aria-label={`${revealed ? "Hide" : "Show"} real answer for question ${number}`}
          className={`${CHIP_BASE} h-7 px-2.5 text-[11px] ${
            revealed
              ? "border-black/90 dark:border-white/60 hover:bg-muted hover:text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {revealed ? (
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {revealed ? "Hide Real Answer" : "Show Real Answer"}
          </span>
          <span className="sm:hidden">{revealed ? "Hide" : "Answer"}</span>
        </button>
      )}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-controls={contentId}
        aria-label={`${collapsed ? "Expand" : "Collapse"} question ${number}`}
        className={`${CHIP_BASE} h-7 px-2 text-[11px] border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted`}
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 motion-reduce:transition-none ${
            collapsed ? "-rotate-90" : ""
          }`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">
          {collapsed ? "Expand" : "Collapse"}
        </span>
      </button>
    </div>
  );
}

function CountPill({ children }) {
  return (
    <span className="rounded-md bg-black/90 dark:bg-white text-white dark:text-black border border-white/30 dark:border-black/30 px-1.5 py-px text-[10px] font-bold tabular-nums">
      {children}
    </span>
  );
}

/**
 * Global controls for the review list: Show/Hide All Real Answers and
 * Expand/Collapse All. In a mixed state each button offers to make
 * everything visible and shows an "n/total" pill so it is never ambiguous.
 */
export function ReviewToolbar({
  totalQuestions,
  revealableTotal,
  revealedCount,
  collapsedCount,
  revealState,
  collapseState,
  onToggleAllReveal,
  onToggleAllCollapse,
  sticky = false,
  className = "",
}) {
  if (totalQuestions === 0) return null;

  const allRevealed = revealState === "all";
  const allCollapsed = collapseState === "all";
  const noneCollapsed = collapseState === "none";

  const revealLabel = allRevealed
    ? "Hide All Real Answers"
    : "Show All Real Answers";
  const collapseLabel = noneCollapsed ? "Collapse All" : "Expand All";

  return (
    <div
      className={`rounded-2xl border border-border bg-card/90 backdrop-blur px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${
        sticky ? "sticky top-2 z-20" : ""
      } ${className}`}
    >
      <div className="text-left min-w-0 sm:flex-1">
        <div className="text-xs font-bold text-foreground">Review answers</div>
        <div
          className="text-[11px] text-muted-foreground tabular-nums"
          role="status"
          aria-live="polite"
        >
          {revealableTotal > 0
            ? `${revealedCount} of ${revealableTotal} real answers shown`
            : "No real answers available"}
          {" · "}
          {allCollapsed
            ? "all collapsed"
            : `${totalQuestions - collapsedCount} of ${totalQuestions} expanded`}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onToggleAllReveal}
          disabled={revealableTotal === 0}
          className={`${CHIP_BASE} h-9 px-3 text-xs w-full sm:w-auto justify-center border-transparent bg-black/90 dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 shadow-xs whitespace-nowrap`}
        >
          {allRevealed ? (
            <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{revealLabel}</span>
          {revealState === "some" && (
            <CountPill>
              {revealedCount}/{revealableTotal}
            </CountPill>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleAllCollapse}
          className={`${CHIP_BASE} h-9 px-3 text-xs w-full sm:w-auto justify-center border-transparent bg-black/90 dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 shadow-xs whitespace-nowrap`}
        >
          {noneCollapsed ? (
            <ChevronsDownUp className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronsUpDown className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{collapseLabel}</span>
          {collapseState === "some" && (
            <CountPill>
              {collapsedCount}/{totalQuestions}
            </CountPill>
          )}
        </button>
      </div>
    </div>
  );
}
