import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { CATEGORY_OPTIONS, colorMap } from "@/utils/templateHelpers";

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Variable"];
// Same 8 values POST /api/extraction-templates validates against (COLORS in
// extraction-templates.service.js) - keeping this list here rather than
// exporting it from templateHelpers since colorMap's keys are already the
// same set and importing colorMap already gets us the swatch classes for
// free.
const COLOR_OPTIONS = Object.keys(colorMap);

let sectionKeySeed = 0;
function makeEmptySection() {
  sectionKeySeed += 1;
  return {
    key: `new-${sectionKeySeed}`,
    name: "",
    topicsText: "",
    questionCount: "",
    marksPerCorrect: "",
    negativeMarksPerWrong: "",
  };
}

// A section's three override fields are deliberately sent as omitted (not
// 0/null) when left blank - see normalizeSections in
// extraction-templates.service.js: a section without its own override is
// meant to fall back to the mock test's/other sections' values, not to
// silently acquire a real 0 that looks intentional.
function buildSectionPayload(section) {
  const name = section.name.trim();
  if (!name) return null;

  const payload = {
    name,
    topics: section.topicsText
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean),
  };

  if (section.questionCount !== "") {
    payload.questionCount = Number(section.questionCount);
  }
  if (section.marksPerCorrect !== "") {
    payload.marksPerCorrect = Number(section.marksPerCorrect);
  }
  if (section.negativeMarksPerWrong !== "") {
    payload.negativeMarksPerWrong = Number(section.negativeMarksPerWrong);
  }

  return payload;
}

const fieldClass =
  "w-full px-3 py-2 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30";
const labelClass =
  "block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5";

function sectionRowFromTemplateSection(section, index) {
  sectionKeySeed += 1;
  return {
    key: `existing-${index}-${sectionKeySeed}`,
    name: section?.name || "",
    topicsText: Array.isArray(section?.topics) ? section.topics.join(", ") : "",
    questionCount:
      section?.questionCount === undefined || section?.questionCount === null
        ? ""
        : String(section.questionCount),
    marksPerCorrect:
      section?.marksPerCorrect === undefined || section?.marksPerCorrect === null
        ? ""
        : String(section.marksPerCorrect),
    negativeMarksPerWrong:
      section?.negativeMarksPerWrong === undefined ||
      section?.negativeMarksPerWrong === null
        ? ""
        : String(section.negativeMarksPerWrong),
  };
}

// isPopular/rating/slug are deliberately never part of this form's payload
// - those stay reserved for the official seeded templates even though the
// backend wouldn't technically stop a regular editor from setting them
// (createTemplate defaults isPopular to false and rating to null when
// omitted, and auto-generates a slug from the name; updateTemplate leaves
// them untouched when omitted, same as every other field here).
//
// Doubles as the edit form: pass `initialTemplate` (a mapTemplate()-shaped
// object with isOwn true) to prefill every field from it and PATCH on
// submit instead of POST. Editing is intentionally scoped to templates the
// workspace itself created - TemplateCard only ever passes initialTemplate
// for a card where template.isOwn is true, and the backend's own
// updateTemplate(templateId, workspaceId, ...) independently re-enforces
// that scoping (workspace_id must match, or it 404s) regardless of what
// the frontend sends.
export default function CreateTemplateModal({
  initialTemplate = null,
  onClose,
  onSaved,
}) {
  const { isViewer } = useAuth();
  const isEditing = Boolean(initialTemplate);
  const [name, setName] = useState(initialTemplate?.name || "");
  const [description, setDescription] = useState(
    initialTemplate?.description || "",
  );
  const [category, setCategory] = useState(
    // mapTemplate() already turned category into its display label
    // ("Custom") for every other read site - CATEGORY_OPTIONS' values are
    // the raw enum ("custom") the <select> and the API both need, so this
    // reverses that lookup rather than adding a second raw field to
    // mapTemplate just for this one form.
    CATEGORY_OPTIONS.find((c) => c.label === initialTemplate?.category)
      ?.value || "custom",
  );
  const [difficulty, setDifficulty] = useState(
    initialTemplate?.difficulty || "Variable",
  );
  const [color, setColor] = useState(initialTemplate?.color || "purple");
  const [questionCount, setQuestionCount] = useState(
    initialTemplate?.questionCountRaw != null
      ? String(initialTemplate.questionCountRaw)
      : "",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialTemplate?.durationMinutesRaw != null
      ? String(initialTemplate.durationMinutesRaw)
      : "",
  );
  const [marksPerCorrect, setMarksPerCorrect] = useState(
    initialTemplate ? String(initialTemplate.marksPerCorrect ?? 1) : "1",
  );
  const [negativeMarksPerWrong, setNegativeMarksPerWrong] = useState(
    initialTemplate ? String(initialTemplate.negativeMarksPerWrong ?? 0.25) : "0.25",
  );
  const [tagsText, setTagsText] = useState(
    (initialTemplate?.tags || []).join(", "),
  );
  const [sections, setSections] = useState(() =>
    (initialTemplate?.sections || []).map(sectionRowFromTemplateSection),
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateSection = (key, patch) => {
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, ...patch } : section,
      ),
    );
  };

  const removeSection = (key) => {
    setSections((current) => current.filter((section) => section.key !== key));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isViewer) return;

    if (!name.trim()) {
      setError("Give the template a name");
      return;
    }
    const questionCountValue = Number(questionCount);
    if (!questionCount || !Number.isFinite(questionCountValue) || questionCountValue <= 0) {
      setError("Question count must be a whole number greater than 0");
      return;
    }

    const sectionsPayload = sections
      .map(buildSectionPayload)
      .filter(Boolean);

    // On create, an empty optional field should just be omitted (the
    // backend fills its own default - see createTemplate above). On edit,
    // omitting it means "leave whatever was there before" (updateTemplate
    // only touches a field when the key is present in body at all - see
    // descriptionProvided/durationMinutesProvided there), so clearing a
    // field in this form and saving needs to send an explicit null to
    // actually clear it, not just drop the key.
    const trimmedDescription = description.trim();
    const descriptionValue = trimmedDescription
      ? trimmedDescription
      : isEditing
        ? null
        : undefined;
    const durationMinutesValue = durationMinutes
      ? Number(durationMinutes)
      : isEditing
        ? null
        : undefined;

    setError("");
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      description: descriptionValue,
      category,
      difficulty,
      color,
      questionCount: questionCountValue,
      durationMinutes: durationMinutesValue,
      marksPerCorrect: Number(marksPerCorrect),
      negativeMarksPerWrong: Number(negativeMarksPerWrong),
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      sections: sectionsPayload,
    };

    try {
      const result = isEditing
        ? await api.updateExtractionTemplate(initialTemplate.id, payload)
        : await api.createExtractionTemplate(payload);
      onSaved(result.template);
    } catch (submitError) {
      setError(
        submitError.message ||
          (isEditing
            ? "Could not update template"
            : "Could not create template"),
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto surface-card border border-border rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? "Edit Template" : "Create Template"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isEditing
                ? "Changes apply the next time this template is used — mock tests already created from it are unaffected."
                : "Saved to your workspace — only your team can see and apply it."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              disabled={isViewer}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My College's Mid-Sem Physics Format"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
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
              <label className={labelClass}>Category</label>
              <select
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
              <label className={labelClass}>Difficulty</label>
              <select
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

          <div>
            <label className={labelClass}>Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={isViewer}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${colorMap[c]} ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-orange-500 ring-offset-card"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass + " mb-0"}>
                Sections & syllabus (optional)
              </label>
              <button
                type="button"
                disabled={isViewer}
                onClick={() =>
                  setSections((current) => [...current, makeEmptySection()])
                }
                className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> Add section
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Each section becomes a topic the AI can classify questions into
              during extraction. Leave the marking fields blank to use this
              template's overall marks above for that section.
            </p>

            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground italic border border-dashed border-border rounded-xl px-3 py-4 text-center">
                No sections yet — extraction will still work, just without
                per-topic syllabus guidance.
              </p>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-xl border border-border bg-muted/40 p-3 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        disabled={isViewer}
                        value={section.name}
                        onChange={(e) =>
                          updateSection(section.key, { name: e.target.value })
                        }
                        placeholder="Section name, e.g. Physics"
                        className={`${fieldClass} flex-1`}
                      />
                      <button
                        type="button"
                        disabled={isViewer}
                        onClick={() => removeSection(section.key)}
                        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      disabled={isViewer}
                      value={section.topicsText}
                      onChange={(e) =>
                        updateSection(section.key, {
                          topicsText: e.target.value,
                        })
                      }
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
                          updateSection(section.key, {
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
                          updateSection(section.key, {
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
                          updateSection(section.key, {
                            negativeMarksPerWrong: e.target.value,
                          })
                        }
                        placeholder="-Marks"
                        title="Negative marks per wrong answer override for this section (optional)"
                        className={`${fieldClass} text-xs`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isViewer}
            title={
              isViewer
                ? `Editor role is required to ${isEditing ? "edit" : "create"} templates`
                : undefined
            }
            className={`flex-1 py-2.5 font-bold rounded-xl text-xs sm:text-sm transition-all ${
              isViewer
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 border border-border"
                : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"
            }`}
          >
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
