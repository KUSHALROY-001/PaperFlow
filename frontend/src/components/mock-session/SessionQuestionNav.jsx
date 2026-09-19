import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { ConfirmDialog } from "../design-system/ConfirmDialog";
import CancelCountdownBanner from "./CancelCountdownBanner";

// How long the user has to undo an exit confirmation before it's actually
// carried out, so one mistaken tap on the confirm button can't leave the
// session outright. Matches the grace period used for the header's
// "Cancel Session" flow (usePreventSessionExit.js).
const EXIT_GRACE_PERIOD_SECONDS = 30;

// Below this drag distance (px), releasing the mobile sheet snaps it back
// open instead of closing it - matches the "flick vs. nudge" threshold most
// native bottom sheets use, so a small accidental drag doesn't dismiss it.
const DRAG_CLOSE_THRESHOLD_PX = 120;

// macOS/iOS's own "sheet" deceleration curve (a soft, overshoot-free ease-
// out) rather than a generic ease - this is what makes the open/close
// motion read as the same kind of smooth, weighted slide as a native
// sheet/tab switch instead of a linear or default-eased transition.
const SHEET_TRANSITION = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";

// The full question grid + legend, shared between the desktop sidebar and
// the mobile sheet below - the two used to be one and the same element
// (this component only ever rendered as a sidebar that also happened to
// stack full-width on mobile); keeping the actual content as one function
// means the desktop and mobile presentations can diverge in layout without
// the question-color logic ever needing to be written twice.
function useQuestionNavContent({
  questions,
  current,
  answers,
  flagged,
  onSelect,
}) {
  const answeredCount = Object.values(answers || {}).filter(
    (a) => a?.selected?.length > 0 || Boolean(a?.text?.trim()),
  ).length;
  const flaggedCount = flagged ? flagged.size : 0;
  const notVisitedCount = Math.max(0, questions.length - answeredCount);

  const grid = (
    <div className="overflow-y-auto scrollbar-hidden flex-1 min-h-0 space-y-2">
      <div className="grid grid-cols-10 lg:grid-cols-5 gap-1.5">
        {questions.map((question, i) => {
          let buttonClass;
          if (i === current) {
            buttonClass =
              "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 font-bold border border-orange-500/30";
          } else if (
            answers[question.questionId]?.selected?.length ||
            answers[question.questionId]?.text?.trim()
          ) {
            buttonClass =
              "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20";
          } else if (flagged.has(question.questionId)) {
            buttonClass =
              "bg-amber-500/15 text-amber-500 border border-amber-500/20";
          } else {
            buttonClass =
              "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted";
          }
          return (
            <button
              key={question.questionId}
              onClick={() => onSelect(i)}
              className={`w-8 h-8 rounded-full text-xs font-semibold transition-all flex items-center justify-center ${buttonClass}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );

  const legend = (
    <div className="shrink-0 mt-4 pt-3 border-t border-border/60 space-y-2 text-xs font-normal">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50 inline-block" />
          <span className="text-muted-foreground">Answered -</span>
        </div>
        <span className="font-semibold text-foreground font-mono">
          {answeredCount}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 border border-amber-500/50 inline-block" />
          <span className="text-muted-foreground">Flagged -</span>
        </div>
        <span className="font-semibold text-foreground font-mono">
          {flaggedCount}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border inline-block" />
          <span className="text-muted-foreground">Not visited -</span>
        </div>
        <span className="font-semibold text-foreground font-mono">
          {notVisitedCount}
        </span>
      </div>
    </div>
  );

  return { grid, legend };
}

export default function SessionQuestionNav({
  questions,
  current,
  setCurrent,
  answers,
  flagged,
  onSelectQuestion,
  exitHref = "/dashboard",
  // Controlled from the parent page (MockSession.jsx / SharedMock.jsx),
  // which also owns the "Q" button rendered inside SessionHeader - the two
  // need to share one boolean, so it can't live locally in either
  // component.
  mobileOpen = false,
  onMobileClose,
}) {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitSecondsLeft, setExitSecondsLeft] = useState(null);

  // Live finger/pointer offset applied to the sheet while dragging its
  // handle, in px. Only ever positive (dragging down, toward closed) -
  // dragging "up" past the fully-open position has nothing to reveal, so
  // that direction is clamped to 0 rather than adding dead motion.
  const dragState = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const closeMobileSheet = () => {
    if (onMobileClose) onMobileClose();
  };

  const handleSelect = (i) => {
    if (onSelectQuestion) {
      onSelectQuestion(i);
    } else {
      setCurrent(i);
    }
    // Picking a question is the whole reason the sheet was opened on
    // mobile - closing it immediately after gets the user straight back to
    // the question instead of making them swipe it away themselves too.
    closeMobileSheet();
  };

  const { grid, legend } = useQuestionNavContent({
    questions,
    current,
    answers,
    flagged,
    onSelect: handleSelect,
  });

  const handleExitClick = (e) => {
    e.preventDefault();
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    setExitSecondsLeft(EXIT_GRACE_PERIOD_SECONDS);
  };

  const handleUndoExit = () => {
    setExitSecondsLeft(null);
  };

  // Ticks the grace-period countdown down to zero, then actually navigates
  // away.
  useEffect(() => {
    if (exitSecondsLeft === null) return;
    if (exitSecondsLeft <= 0) {
      navigate(exitHref);
      return;
    }
    const timer = setTimeout(() => {
      setExitSecondsLeft((seconds) =>
        seconds === null ? seconds : seconds - 1,
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [exitSecondsLeft, navigate, exitHref]);

  // Whenever the sheet closes from outside a drag (Q button toggled off,
  // a question picked, backdrop tapped), clear any leftover drag offset so
  // the next open always starts from a clean, fully-open position rather
  // than wherever a previous drag happened to leave it.
  useEffect(() => {
    if (!mobileOpen) {
      setDragY(0);
    }
  }, [mobileOpen]);

  const handleDragStart = (e) => {
    dragState.current = {
      startY: e.touches ? e.touches[0].clientY : e.clientY,
    };
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!dragState.current) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragY(Math.max(0, clientY - dragState.current.startY));
  };

  const handleDragEnd = () => {
    if (!dragState.current) return;
    dragState.current = null;
    setIsDragging(false);
    if (dragY > DRAG_CLOSE_THRESHOLD_PX) {
      closeMobileSheet();
    } else {
      setDragY(0);
    }
  };

  return (
    <>
      {/* Desktop sidebar - unchanged from before this feature existed,
          just no longer also doubling as the full-width mobile block it
          used to stack into (that's now the sheet below instead). */}
      <aside className="hidden lg:flex lg:w-56 bg-card lg:border-r border-border flex-col p-4 lg:fixed lg:h-full z-10 font-sans">
        <div className="shrink-0 mb-4">
          <Link
            to={exitHref}
            onClick={handleExitClick}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Exit Session
          </Link>
        </div>

        <div className="shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Questions ({questions.length})
        </div>

        {grid}
        {legend}
      </aside>

      {/* Mobile: a slim persistent "Exit Session" strip - the question
          grid itself no longer sits inline here (that was the "annoying
          UI" this whole change is for); it now lives in the sheet below,
          opened via the "Q" button in SessionHeader. */}
      <div className="lg:hidden flex items-center px-4 py-3 border-b border-border bg-card font-sans">
        <Link
          to={exitHref}
          onClick={handleExitClick}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Exit Session
        </Link>
      </div>

      {/* Mobile question navigator sheet. Always mounted rather than
          conditionally rendered - open/close is purely a CSS transform, so
          a close can be driven by either a discrete toggle (Q button,
          backdrop tap) or an in-progress drag, without mount/unmount timing
          getting in the way of either. */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeMobileSheet}
        />
        <div
          className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col font-sans"
          style={{
            transform: `translateY(${mobileOpen ? dragY : "100%"}${
              mobileOpen ? "px" : ""
            })`,
            transition: isDragging ? "none" : SHEET_TRANSITION,
          }}
        >
          {/* Drag handling is scoped to this header strip only, not the
              whole sheet - the grid below needs its taps and scroll to
              reach the question buttons untouched, so only the handle bar
              + title area double as the drag-to-dismiss surface. */}
          <div
            className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseMove={isDragging ? handleDragMove : undefined}
            onMouseUp={handleDragEnd}
            onMouseLeave={isDragging ? handleDragEnd : undefined}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1.5 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Questions ({questions.length})
              </span>
              <button
                type="button"
                onClick={closeMobileSheet}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close question navigator"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
            {grid}
            {legend}
          </div>
        </div>
      </div>

      {showExitModal && (
        <ConfirmDialog
          open={showExitModal}
          onOpenChange={(open) => !open && setShowExitModal(false)}
          title="Exit Test Session?"
          description="Are you sure you want to exit this session? Your active test progress will be left."
          confirmLabel="Exit Session"
          warning={true}
          onConfirm={handleConfirmExit}
        />
      )}

      {/* One-minute grace period after confirming exit, so a single
          mistaken tap can't leave the session outright */}
      {exitSecondsLeft !== null && (
        <CancelCountdownBanner
          secondsLeft={exitSecondsLeft}
          onUndo={handleUndoExit}
          title="Exiting this session…"
          message="You'll be taken back in"
        />
      )}
    </>
  );
}
