import { Plus } from "lucide-react";
import { labelClass } from "@/utils/templateHelpers";
import TemplateSectionRow from "./TemplateSectionRow";

export default function TemplateSectionsList({
  sections = [],
  onUpdateSection,
  onRemoveSection,
  onAddSection,
  isViewer,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelClass + " mb-0"}>
          Sections & syllabus (optional)
        </label>
        <button
          type="button"
          disabled={isViewer}
          onClick={onAddSection}
          className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> Add section
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Each section becomes a topic the AI can classify questions into during
        extraction. Leave the marking fields blank to use this template's
        overall marks above for that section.
      </p>

      {sections.length === 0 ? (
        <p className="text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-4 text-center">
          No sections yet — extraction will still work, just without per-topic
          syllabus guidance.
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <TemplateSectionRow
              key={section.key}
              section={section}
              onUpdate={onUpdateSection}
              onRemove={onRemoveSection}
              isViewer={isViewer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
