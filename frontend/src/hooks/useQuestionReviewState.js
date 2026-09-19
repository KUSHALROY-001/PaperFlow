import { useCallback, useMemo, useState } from "react";
import { hasRealAnswer } from "@/components/shared/QuestionAnswerReview";
import {
  countIn,
  getBulkState,
  setMany,
  toggleInSet,
} from "@/lib/reviewControls";

/**
 * View-only state for the result review UI: which questions have their real
 * answer revealed and which are collapsed. It never touches scoring data.
 *
 * `questions` is the list the *global* controls act on (pass the visible,
 * filtered list). Per-question state is keyed by questionId, so it survives
 * filter changes. Defaults: every real answer hidden, every card expanded.
 *
 * Mixed-state rule (both global buttons): when only some are on, the button
 * offers to make EVERYTHING visible ("Show All Real Answers" / "Expand All");
 * it only flips to "Hide All" / "Collapse All" once everything is already
 * visible / expanded.
 *
 * `isRevealable(question)` decides which questions have a reveal button (and
 * so count towards the global state). It must be a stable reference (define
 * it at module level). Default: the question has an answer key/explanation.
 */
const EMPTY_LIST = [];

export function useQuestionReviewState(
  questions,
  isRevealable = hasRealAnswer,
) {
  const [revealed, setRevealed] = useState(() => new Set());
  const [collapsed, setCollapsed] = useState(() => new Set());

  const list = questions || EMPTY_LIST;
  const ids = useMemo(() => list.map((q) => q.questionId), [list]);
  // Questions with nothing to reveal don't get a button, so they must not
  // count towards the global "all revealed" state either.
  const revealableIds = useMemo(
    () => list.filter(isRevealable).map((q) => q.questionId),
    [list, isRevealable],
  );

  const revealedCount = countIn(revealed, revealableIds);
  const collapsedCount = countIn(collapsed, ids);

  const toggleReveal = useCallback(
    (id) => setRevealed((prev) => toggleInSet(prev, id)),
    [],
  );
  const toggleCollapse = useCallback(
    (id) => setCollapsed((prev) => toggleInSet(prev, id)),
    [],
  );

  const toggleAllReveal = useCallback(() => {
    // all revealed → hide all; none/some → reveal all
    setRevealed((prev) =>
      setMany(prev, revealableIds, countIn(prev, revealableIds) < revealableIds.length),
    );
  }, [revealableIds]);

  const toggleAllCollapse = useCallback(() => {
    // none collapsed → collapse all; some/all collapsed → expand all
    setCollapsed((prev) =>
      setMany(prev, ids, countIn(prev, ids) === 0),
    );
  }, [ids]);

  return {
    isRevealed: (id) => revealed.has(id),
    isCollapsed: (id) => collapsed.has(id),
    toggleReveal,
    toggleCollapse,
    toolbarProps: {
      totalQuestions: ids.length,
      revealableTotal: revealableIds.length,
      revealedCount,
      collapsedCount,
      revealState: getBulkState(revealedCount, revealableIds.length),
      collapseState: getBulkState(collapsedCount, ids.length),
      onToggleAllReveal: toggleAllReveal,
      onToggleAllCollapse: toggleAllCollapse,
    },
  };
}
