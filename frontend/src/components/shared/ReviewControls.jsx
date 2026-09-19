import { useEffect, useRef, useState } from "react";
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
  // Compact short labels (SARA / CA) only when this bar is actually stuck as
  // a sticky navbar AND the viewport is below Tailwind's `sm` breakpoint —
  // at the top of the results list the full labels can stack on two rows.
  const sentinelRef = useRef(null);
  const [isStuck, setIsStuck] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!sticky || !sentinelRef.current) {
      setIsStuck(false);
      return undefined;
    }
    const sentinel = sentinelRef.current;
    // rootMargin top matches sticky top-2 (0.5rem) so "stuck" flips when the
    // bar pins under the viewport edge rather than when the sentinel barely
    // leaves the visible area.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-8px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sticky, totalQuestions]);

  if (totalQuestions === 0) return null;

  const allRevealed = revealState === "all";
  const allCollapsed = collapseState === "all";
  const noneCollapsed = collapseState === "none";
  const compact = sticky && isStuck && isNarrow;

  const revealLabelFull = allRevealed
    ? "Hide All Real Answers"
    : "Show All Real Answers";
  const collapseLabelFull = noneCollapsed ? "Collapse All" : "Expand All";
  // Abbreviations only used while stuck on small screens (see compact).
  const revealLabelCompact = allRevealed ? "HARA" : "SARA";
  const collapseLabelCompact = noneCollapsed ? "CA" : "EA";
  const revealLabel = compact ? revealLabelCompact : revealLabelFull;
  const collapseLabel = compact ? collapseLabelCompact : collapseLabelFull;

  return (
    <>
      {sticky && (
        <div
          ref={sentinelRef}
          className="h-px w-full pointer-events-none"
          aria-hidden="true"
        />
      )}
      <div
        className={`rounded-2xl border border-border bg-card/90 backdrop-blur px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${
          sticky ? "sticky top-2 z-20" : ""
        } ${compact ? "shadow-md" : ""} ${className}`}
      >
        <div
          className={`text-left min-w-0 sm:flex-1 ${
            compact ? "hidden" : ""
          }`}
        >
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

        <div
          className={`flex gap-2 w-full sm:w-auto ${
            compact
              ? "flex-row"
              : "flex-col sm:flex-row flex-wrap"
          }`}
        >
          <button
            type="button"
            onClick={onToggleAllReveal}
            disabled={revealableTotal === 0}
            title={revealLabelFull}
            aria-label={
              compact
                ? `${revealedCount} of ${revealableTotal} · ${revealLabelFull}`
                : revealLabelFull
            }
            className={`${CHIP_BASE} h-9 px-3 text-xs justify-center border-transparent bg-black/90 dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 shadow-xs whitespace-nowrap ${
              compact ? "flex-1 min-w-0" : "w-full sm:w-auto"
            }`}
          >
            {compact && (
              <span className="tabular-nums font-bold shrink-0">
                {revealableTotal > 0
                  ? `${revealedCount} of ${revealableTotal}`
                  : "—"}
              </span>
            )}
            {allRevealed ? (
              <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{revealLabel}</span>
            {!compact && revealState === "some" && (
              <CountPill>
                {revealedCount}/{revealableTotal}
              </CountPill>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleAllCollapse}
            title={collapseLabelFull}
            aria-label={
              compact
                ? `${totalQuestions - collapsedCount} of ${totalQuestions} · ${collapseLabelFull}`
                : collapseLabelFull
            }
            className={`${CHIP_BASE} h-9 px-3 text-xs justify-center border-transparent bg-black/90 dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 shadow-xs whitespace-nowrap ${
              compact ? "flex-1 min-w-0" : "w-full sm:w-auto"
            }`}
          >
            {compact && (
              <span className="tabular-nums font-bold shrink-0">
                {`${totalQuestions - collapsedCount} of ${totalQuestions}`}
              </span>
            )}
            {noneCollapsed ? (
              <ChevronsDownUp className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{collapseLabel}</span>
            {!compact && collapseState === "some" && (
              <CountPill>
                {collapsedCount}/{totalQuestions}
              </CountPill>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
