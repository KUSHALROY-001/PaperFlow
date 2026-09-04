import { X, Loader2 } from "lucide-react";
import { useTemplateForm } from "@/hooks/useTemplateForm";
import TemplateBasicInfoFields from "./TemplateBasicInfoFields";
import TemplateColorPicker from "./TemplateColorPicker";
import TemplateScoringFields from "./TemplateScoringFields";
import TemplateSectionsList from "./TemplateSectionsList";
import TemplateQuestionTypeMarksList from "./TemplateQuestionTypeMarksList";
import { fieldClass, labelClass } from "@/utils/templateHelpers";

export default function CreateTemplateModal({
  initialTemplate = null,
  onClose,
  onSaved,
}) {
  const {
    isEditing,
    isViewer,
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    difficulty,
    setDifficulty,
    color,
    setColor,
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
    sections,
    updateSection,
    removeSection,
    addSection,
    markingSchemeDescription,
    setMarkingSchemeDescription,
    questionTypeMarks,
    updateQuestionTypeMark,
    removeQuestionTypeMark,
    addQuestionTypeMark,
    error,
    isSubmitting,
    handleSubmit,
  } = useTemplateForm({
    initialTemplate,
    onSaved,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto surface-card border border-border rounded-3xl shadow-2xl p-6"
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
          <TemplateBasicInfoFields
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            category={category}
            setCategory={setCategory}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            isViewer={isViewer}
          />

          <TemplateColorPicker
            color={color}
            setColor={setColor}
            isViewer={isViewer}
          />

          <TemplateScoringFields
            questionCount={questionCount}
            setQuestionCount={setQuestionCount}
            durationMinutes={durationMinutes}
            setDurationMinutes={setDurationMinutes}
            marksPerCorrect={marksPerCorrect}
            setMarksPerCorrect={setMarksPerCorrect}
            negativeMarksPerWrong={negativeMarksPerWrong}
            setNegativeMarksPerWrong={setNegativeMarksPerWrong}
            tagsText={tagsText}
            setTagsText={setTagsText}
            isViewer={isViewer}
          />

          <TemplateSectionsList
            sections={sections}
            onUpdateSection={updateSection}
            onRemoveSection={removeSection}
            onAddSection={addSection}
            isViewer={isViewer}
          />

          <TemplateQuestionTypeMarksList
            questionTypeMarks={questionTypeMarks}
            onUpdateRow={updateQuestionTypeMark}
            onRemoveRow={removeQuestionTypeMark}
            onAddRow={addQuestionTypeMark}
            isViewer={isViewer}
          />

          <div>
            <label className={labelClass}>
              Marking scheme note (optional)
            </label>
            <input
              disabled={isViewer}
              value={markingSchemeDescription}
              onChange={(e) => setMarkingSchemeDescription(e.target.value)}
              placeholder='e.g. "JEE Advanced pattern - partial marking on multiple-correct"'
              className={fieldClass}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-md hover:bg-muted text-xs sm:text-sm transition-all"
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-bold text-xs sm:text-sm transition-all ${
              isViewer
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 border border-border"
                : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{isEditing ? "Saving..." : "Creating..."}</span>
              </>
            ) : (
              <span>{isEditing ? "Save Changes" : "Create Template"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
