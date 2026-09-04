import { Plus, Trash2 } from "lucide-react";
import { fieldClass, labelClass } from "@/utils/templateHelpers";

// Sits alongside TemplateSectionsList in the template form. Where a
// section's own marksPerCorrect/negativeMarksPerWrong (TemplateSectionRow)
// can only express ONE value for that entire section, these rows express
// marks PER QUESTION TYPE within the paper as a whole - the only way to
// represent a JEE-Advanced-style scheme where Physics alone has
// single-correct +3/-1, multiple-correct +4/-2, and numerical +4/0. Saved
// as settings.marking_scheme.by_question_type (see
// extraction-templates.service.js#normalizeMarkingScheme) and read by the
// worker in provider.py#_apply_section_marks / #_classify_question_type_label.
export default function TemplateQuestionTypeMarksList({
  questionTypeMarks = [],
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  isViewer,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelClass + " mb-0"}>
          Marks by question type (optional)
        </label>
        <button
          type="button"
          disabled={isViewer}
          onClick={onAddRow}
          className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> Add question type
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        For papers where marking varies by question type WITHIN a section
        (e.g. JEE Advanced: single-correct, multiple-correct, and numerical
        each carry different marks). The AI is told to identify each
        question&apos;s type and apply these; only "Single" / "Multiple"
        labels can currently be matched to this app&apos;s single/multi
        question types - other types (e.g. numerical, matching-list) are
        reported as unmapped after processing rather than applied silently.
      </p>

      {questionTypeMarks.length === 0 ? (
        <p className="text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-4 text-center">
          No per-type marking — every question uses the section/paper
          default above.
        </p>
      ) : (
        <div className="space-y-2">
          {questionTypeMarks.map((row) => (
            <div
              key={row.key}
              className="rounded-md border border-border bg-muted/40 p-3 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center"
            >
              <input
                disabled={isViewer}
                value={row.label}
                onChange={(e) =>
                  onUpdateRow(row.key, { label: e.target.value })
                }
                placeholder="Type label, e.g. Single Correct"
                className={fieldClass}
              />
              <input
                disabled={isViewer}
                type="number"
                min="0"
                step="0.25"
                value={row.marksPerCorrect}
                onChange={(e) =>
                  onUpdateRow(row.key, { marksPerCorrect: e.target.value })
                }
                placeholder="+Marks"
                title="Marks per correct answer for this question type"
                className={`${fieldClass} w-24 text-xs`}
              />
              <input
                disabled={isViewer}
                type="number"
                min="0"
                step="0.25"
                value={row.negativeMarksPerWrong}
                onChange={(e) =>
                  onUpdateRow(row.key, {
                    negativeMarksPerWrong: e.target.value,
                  })
                }
                placeholder="-Marks"
                title="Negative marks per wrong answer for this question type"
                className={`${fieldClass} w-24 text-xs`}
              />
              <button
                type="button"
                disabled={isViewer}
                onClick={() => onRemoveRow(row.key)}
                className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
