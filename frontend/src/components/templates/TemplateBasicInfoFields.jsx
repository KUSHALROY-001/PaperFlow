import { useId } from "react";
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  fieldClass,
  labelClass,
} from "@/utils/templateHelpers";

export default function TemplateBasicInfoFields({
  name,
  setName,
  description,
  setDescription,
  category,
  setCategory,
  difficulty,
  setDifficulty,
  isViewer,
}) {
  const uid = useId();
  return (
    <>
      <div>
        <label htmlFor={`${uid}-name`} className={labelClass}>
          Name
        </label>
        <input
          id={`${uid}-name`}
          disabled={isViewer}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My College's Mid-Sem Physics Format"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor={`${uid}-description`} className={labelClass}>
          Description
        </label>
        <textarea
          id={`${uid}-description`}
          disabled={isViewer}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What kind of exam is this format for?"
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-category`} className={labelClass}>
            Category
          </label>
          <select
            id={`${uid}-category`}
            disabled={isViewer}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={fieldClass}
          >
            {CATEGORY_OPTIONS.filter((c) => c.value).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-difficulty`} className={labelClass}>
            Difficulty
          </label>
          <select
            id={`${uid}-difficulty`}
            disabled={isViewer}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className={fieldClass}
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
