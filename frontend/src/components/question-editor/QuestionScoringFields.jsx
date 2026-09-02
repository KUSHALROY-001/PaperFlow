/**
 * Per-question marks controls. Sits under topic in the question editor.
 * Empty fields mean "use mock-test default at score time".
 */
export default function QuestionScoringFields({
  marksPerCorrect,
  negativeMarksPerWrong,
  updateSelected,
  isViewer,
  paperDefaultMarks = null,
  paperDefaultNegative = null,
}) {
  const toInput = (value) =>
    value === null || value === undefined ? "" : String(value);

  const parseOrNull = (raw) => {
    if (raw === "" || raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const hasOverride =
    marksPerCorrect !== null && marksPerCorrect !== undefined
      ? true
      : negativeMarksPerWrong !== null && negativeMarksPerWrong !== undefined;

  const defaultHint =
    paperDefaultMarks != null || paperDefaultNegative != null
      ? `Paper default: +${paperDefaultMarks ?? "?"} / -${paperDefaultNegative ?? "?"}`
      : "Empty = use paper default when scoring";

  return (
    <div className="mt-3 mb-4 rounded-xl border border-border bg-muted/30 p-3 sm:p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Scoring
        </span>
        <span className="text-[11px] text-muted-foreground">{defaultHint}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
            Marks
          </label>
          <input
            type="number"
            min="0"
            step="any"
            disabled={isViewer}
            value={toInput(marksPerCorrect)}
            onChange={(e) =>
              updateSelected("marksPerCorrect", parseOrNull(e.target.value))
            }
            placeholder={
              paperDefaultMarks != null ? String(paperDefaultMarks) : "e.g. 4"
            }
            className={`w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40 ${
              isViewer ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
            −ve marks
          </label>
          <input
            type="number"
            min="0"
            step="any"
            disabled={isViewer}
            value={toInput(negativeMarksPerWrong)}
            onChange={(e) =>
              updateSelected(
                "negativeMarksPerWrong",
                parseOrNull(e.target.value),
              )
            }
            placeholder={
              paperDefaultNegative != null
                ? String(paperDefaultNegative)
                : "e.g. 1"
            }
            className={`w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40 ${
              isViewer ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>
      </div>
      {hasOverride && !isViewer && (
        <button
          type="button"
          onClick={() => {
            updateSelected("marksPerCorrect", null);
            updateSelected("negativeMarksPerWrong", null);
          }}
          className="mt-2 text-[11px] font-semibold text-orange-500 hover:text-orange-600"
        >
          Reset to paper default
        </button>
      )}
    </div>
  );
}
