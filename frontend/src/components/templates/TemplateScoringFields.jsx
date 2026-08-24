import { fieldClass, labelClass } from "@/utils/templateHelpers";

export default function TemplateScoringFields({
  questionCount,
  setQuestionCount,
  durationMinutes,
  setDurationMinutes,
  marksPerCorrect,
  setMarksPerCorrect,
  negativeMarksPerWrong,
  setNegativeMarksPerWrong,
  tagsText,
  setTagsText,
  isViewer,
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Question count</label>
          <input
            disabled={isViewer}
            type="number"
            min="1"
            step="1"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            placeholder="e.g. 90"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Duration (minutes)</label>
          <input
            disabled={isViewer}
            type="number"
            min="1"
            step="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Optional"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Marks per correct</label>
          <input
            disabled={isViewer}
            type="number"
            min="0"
            step="0.25"
            value={marksPerCorrect}
            onChange={(e) => setMarksPerCorrect(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Negative marks per wrong</label>
          <input
            disabled={isViewer}
            type="number"
            min="0"
            step="0.25"
            value={negativeMarksPerWrong}
            onChange={(e) => setNegativeMarksPerWrong(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tags</label>
        <input
          disabled={isViewer}
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="Comma-separated, e.g. physics, mid-sem, college"
          className={fieldClass}
        />
      </div>
    </>
  );
}
