import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import QuestionContent from "../shared/QuestionContent";
import MathText from "../shared/MathText";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";
import MarksBadge from "@/components/shared/MarksBadge";

// Minimum horizontal travel, in px, before a touch counts as a swipe
// rather than a tap.
const SWIPE_THRESHOLD_PX = 48;
// How much further horizontal than vertical movement needs to be before
// a gesture is treated as a swipe rather than the user scrolling the
// (possibly long) question text - checked early, at SWIPE_DECIDE_PX, to
// decide whether to claim the gesture at all, and again at touchend
// against the full distance to decide navigation direction.
const SWIPE_RATIO = 1.25;
// Distance at which direction gets decided (horizontal vs vertical) and,
// if horizontal, the gesture gets claimed via preventDefault - small
// enough that the decision happens almost immediately, before the
// browser's own gesture recognizer has committed to treating it as a
// native scroll.
const SWIPE_DECIDE_PX = 10;

export default function SessionQuestionView({
  q,
  current,
  totalQuestions,
  selected,
  flagged,
  toggleFlag,
  handleAnswer,
  progress,
  slideDirection,
  onNavigateNext,
  onNavigatePrev,
}) {
  const cardRef = useRef(null);
  // Keep the latest navigate callbacks in refs rather than as a
  // useEffect dependency array - re-running the effect (removing and
  // re-adding native listeners) every time MockSession.jsx re-renders
  // with new handleNavigateNext/handleNavigatePrev identities would risk
  // dropping a gesture that's already in progress.
  const onNavigateNextRef = useRef(onNavigateNext);
  const onNavigatePrevRef = useRef(onNavigatePrev);
  onNavigateNextRef.current = onNavigateNext;
  onNavigatePrevRef.current = onNavigatePrev;

  // Swipe navigation is wired up via native addEventListener with
  // { passive: false } instead of React's onTouchStart/onTouchMove JSX
  // props, which is deliberate and load-bearing, not stylistic: React
  // attaches touchstart/touchmove listeners as PASSIVE by default (a
  // perf optimization matching browsers' own recommendation for scroll
  // performance), which means event.preventDefault() called from a JSX
  // onTouchMove handler is silently ignored. Without a real
  // preventDefault, the browser's native gesture recognizer stays free
  // to decide - on the very first few pixels of movement - that a drag
  // with any vertical component at all (which is virtually every real
  // finger swipe) is a page scroll, and once it claims the gesture that
  // way, many mobile browsers (iOS Safari included) deliver touchcancel
  // to JS listeners instead of touchend. That's silent and total: the
  // ref just gets cleared and onNavigateNext/onNavigatePrev never fire,
  // which matches "swipe does nothing" exactly - not flaky, consistently
  // broken on real touch devices, while working fine under emulated
  // mouse-based touch testing that doesn't reproduce the passive-listener
  // behavior. Manually attaching with passive: false is what lets
  // touchmove's preventDefault below actually claim the gesture in time.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let start = null; // { x, y }
    let direction = null; // null (undecided) | "horizontal" | "vertical"

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) {
        start = null;
        direction = null;
        return;
      }
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
      direction = null;
    };

    const handleTouchMove = (event) => {
      if (!start) return;
      const touch = event.touches[0];
      if (!touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (direction === null) {
        if (Math.abs(dx) < SWIPE_DECIDE_PX && Math.abs(dy) < SWIPE_DECIDE_PX) {
          return; // Not enough movement yet to tell intent apart.
        }
        direction =
          Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO ? "horizontal" : "vertical";
      }

      if (direction === "horizontal") {
        // Claims the gesture so the browser can't hand it to native
        // scroll/pan and cancel our touchend - see the effect comment
        // above. Vertical gestures are deliberately left alone so
        // scrolling a long question's text keeps working exactly as
        // before.
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event) => {
      const touch = event.changedTouches[0];
      const wasHorizontal = direction === "horizontal";
      const gestureStart = start;
      start = null;
      direction = null;

      if (!wasHorizontal || !gestureStart || !touch) return;

      const horizontalDistance = touch.clientX - gestureStart.x;
      if (Math.abs(horizontalDistance) < SWIPE_THRESHOLD_PX) return;

      if (horizontalDistance < 0) {
        onNavigateNextRef.current?.();
      } else {
        onNavigatePrevRef.current?.();
      }
    };

    const handleTouchCancel = () => {
      start = null;
      direction = null;
    };

    card.addEventListener("touchstart", handleTouchStart, { passive: true });
    card.addEventListener("touchmove", handleTouchMove, { passive: false });
    card.addEventListener("touchend", handleTouchEnd, { passive: true });
    card.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      card.removeEventListener("touchstart", handleTouchStart);
      card.removeEventListener("touchmove", handleTouchMove);
      card.removeEventListener("touchend", handleTouchEnd);
      card.removeEventListener("touchcancel", handleTouchCancel);
    };
    // Re-attaches per question (cardRef's node doesn't change identity
    // across questions, but this keeps the in-progress gesture state
    // above cleanly scoped to one question at a time rather than
    // persisting stale start/direction across a navigation).
  }, [q?.questionId]);

  if (!q) return null;

  let slideClass;
  if (slideDirection === "left") {
    slideClass = "animate-slide-left";
  } else if (slideDirection === "right") {
    slideClass = "animate-slide-right";
  } else {
    slideClass = "";
  }

  return (
    <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full font-sans">
      <div
        key={q.questionId}
        ref={cardRef}
        className={`surface-card touch-pan-y rounded-md sm:rounded-3xl p-4 sm:p-8 border border-border ${slideClass}`}
      >
        <div className="flex items-start justify-between gap-2.5 sm:gap-4 mb-5 sm:mb-6">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2.5 sm:px-3 py-1 rounded-full shrink-0">
              Q{current + 1} of {totalQuestions}
            </span>
            {q.topic && (
              <span
                className="text-[11px] sm:text-xs text-muted-foreground bg-muted border border-border px-2.5 sm:px-3 py-1 rounded-full font-normal max-w-45 sm:max-w-none truncate"
                title={q.topic}
              >
                {q.topic}
              </span>
            )}
            {q.subtopic && (
              <span
                className="text-[11px] sm:text-xs text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 sm:px-3 py-1 rounded-full font-normal max-w-40 sm:max-w-none truncate"
                title={q.subtopic}
              >
                {q.subtopic}
              </span>
            )}
            {/* Only present when publisher enabled showMarksToStudents */}
            <MarksBadge
              marksPerCorrect={q.marksPerCorrect}
              negativeMarksPerWrong={q.negativeMarksPerWrong}
            />
          </div>
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all shrink-0 ${
              flagged.has(q.questionId)
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />{" "}
            <span>{flagged.has(q.questionId) ? "Flagged" : "Flag"}</span>
          </button>
        </div>

        {/* Wraps the question's text AND its options together, even
            though they're rendered as separate sibling trees below - a
            ![[img:slot_key]] marker inside an option (e.g. a List-I/
            List-II matching question where each option references a
            different image) needs the exact same asset lookup the
            question stem itself uses. See diagramAssetsContext.jsx. */}
        <DiagramAssetsProvider assets={q.diagramAssets}>
          <div className="mb-8">
            <QuestionContent
              text={q.text}
              passage={q.passage}
              textClassName="text-base sm:text-lg font-normal text-foreground leading-relaxed"
            />
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswer(i)}
                className={`w-full text-left px-5 py-4 rounded-md border text-sm transition-all ${
                  selected === i
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-500 font-medium shadow-2xs"
                    : "border-border bg-card hover:bg-muted text-foreground font-normal"
                }`}
              >
                <span className="font-semibold text-orange-500 mr-3">
                  {String.fromCodePoint(65 + i)}.
                </span>
                <MathText text={opt} />
              </button>
            ))}
          </div>
        </DiagramAssetsProvider>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={current === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground font-medium rounded-md hover:bg-muted transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <div className="text-xs font-normal text-muted-foreground">
            {progress}% complete
          </div>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={current === totalQuestions - 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-medium rounded-md shadow-xs transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
