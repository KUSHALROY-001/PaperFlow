import { Trash2 } from "lucide-react";
import { fieldClass } from "@/utils/templateHelpers";

export default function TemplateSectionRow({
  section,
  onUpdate,
  onRemove,
  isViewer,
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          disabled={isViewer}
          value={section.name}
          onChange={(e) => onUpdate(section.key, { name: e.target.value })}
          placeholder="Section name, e.g. Physics"
          className={`${fieldClass} flex-1`}
        />
        <button
          type="button"
          disabled={isViewer}
          onClick={() => onRemove(section.key)}
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        disabled={isViewer}
        value={section.topicsText}
        onChange={(e) => onUpdate(section.key, { topicsText: e.target.value })}
        placeholder="Topics, comma-separated, e.g. Mechanics, Thermodynamics, Optics"
        className={fieldClass}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          disabled={isViewer}
          type="number"
          min="1"
          step="1"
          value={section.questionCount}
          onChange={(e) =>
            onUpdate(section.key, {
              questionCount: e.target.value,
            })
          }
          placeholder="# Qs"
          title="Expected question count for this section (optional)"
          className={`${fieldClass} text-xs`}
        />
        <input
          disabled={isViewer}
          type="number"
          min="0"
          step="0.25"
          value={section.marksPerCorrect}
          onChange={(e) =>
            onUpdate(section.key, {
              marksPerCorrect: e.target.value,
            })
          }
          placeholder="+Marks"
          title="Marks per correct answer override for this section (optional)"
          className={`${fieldClass} text-xs`}
        />
        <input
          disabled={isViewer}
          type="number"
          min="0"
          step="0.25"
          value={section.negativeMarksPerWrong}
          onChange={(e) =>
            onUpdate(section.key, {
              negativeMarksPerWrong: e.target.value,
            })
          }
          placeholder="-Marks"
          title="Negative marks per wrong answer override for this section (optional)"
          className={`${fieldClass} text-xs`}
        />
      </div>
    </div>
  );
}
