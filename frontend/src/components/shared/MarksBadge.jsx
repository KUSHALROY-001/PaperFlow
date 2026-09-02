export function formatMarksLabel(marksPerCorrect, negativeMarksPerWrong) {
  const hasPlus =
    marksPerCorrect !== null &&
    marksPerCorrect !== undefined &&
    marksPerCorrect !== "";
  const hasMinus =
    negativeMarksPerWrong !== null &&
    negativeMarksPerWrong !== undefined &&
    negativeMarksPerWrong !== "";

  if (!hasPlus && !hasMinus) return null;

  const plus = hasPlus ? `+${Number(marksPerCorrect)}` : null;
  const minus = hasMinus ? `-${Number(negativeMarksPerWrong)}` : null;

  if (plus && minus) return `${plus} / ${minus}`;
  if (plus) return plus;
  return minus;
}

/**
 * Compact chip for +marks / -marks used in editor sidebar, review cards,
 * output, and live preview.
 */
export default function MarksBadge({
  marksPerCorrect,
  negativeMarksPerWrong,
  className = "",
  unsetLabel = null,
}) {
  const label = formatMarksLabel(marksPerCorrect, negativeMarksPerWrong);

  if (!label) {
    if (!unsetLabel) return null;
    return (
      <span
        className={`rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 ${className}`}
        title="Marks not set for this question"
      >
        {unsetLabel}
      </span>
    );
  }

  return (
    <span
      className={`rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 tabular-nums ${className}`}
      title="Marks for correct / negative marks for wrong"
    >
      {label}
    </span>
  );
}
