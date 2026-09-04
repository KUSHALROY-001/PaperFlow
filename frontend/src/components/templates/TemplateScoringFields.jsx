import { useId } from "react";
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
  const uid = useId();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-question-count`} className={labelClass}>
            Question count
          </label>
          <input
            id={`${uid}-question-count`}
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
          <label htmlFor={`${uid}-duration`} className={labelClass}>
            Duration (minutes)
          </label>
          <input
            id={`${uid}-duration`}
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
          <label htmlFor={`${uid}-marks-per-correct`} className={labelClass}>
            Marks per correct
          </label>
          <input
            id={`${uid}-marks-per-correct`}
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
          <label htmlFor={`${uid}-negative-marks`} className={labelClass}>
            Negative marks per wrong
          </label>
          <input
            id={`${uid}-negative-marks`}
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
        <label htmlFor={`${uid}-tags`} className={labelClass}>
          Tags
        </label>
        <input
          id={`${uid}-tags`}
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
