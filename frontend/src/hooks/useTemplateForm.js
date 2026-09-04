import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import {
  CATEGORY_OPTIONS,
  buildSectionPayload,
  buildQuestionTypeMarkPayload,
  makeEmptyQuestionTypeMark,
  makeEmptySection,
  sectionRowFromTemplateSection,
} from "@/utils/templateHelpers";

export function useTemplateForm({ initialTemplate = null, onSaved }) {
  const { isViewer } = useAuth();
  const isEditing = Boolean(initialTemplate);

  const [name, setName] = useState(initialTemplate?.name || "");
  const [description, setDescription] = useState(
    initialTemplate?.description || "",
  );
  const [category, setCategory] = useState(
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
    initialTemplate
      ? String(initialTemplate.negativeMarksPerWrong ?? 0.25)
      : "0.25",
  );
  const [tagsText, setTagsText] = useState(
    (initialTemplate?.tags || []).join(", "),
  );
  const [sections, setSections] = useState(() =>
    (initialTemplate?.sections || []).map(sectionRowFromTemplateSection),
  );
  const [markingSchemeDescription, setMarkingSchemeDescription] = useState(
    initialTemplate?.markingSchemeDescription || "",
  );
  const [questionTypeMarks, setQuestionTypeMarks] = useState(
    () => initialTemplate?.questionTypeMarks || [],
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

  const addSection = () => {
    setSections((current) => [...current, makeEmptySection()]);
  };

  const updateQuestionTypeMark = (key, patch) => {
    setQuestionTypeMarks((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const removeQuestionTypeMark = (key) => {
    setQuestionTypeMarks((current) => current.filter((row) => row.key !== key));
  };

  const addQuestionTypeMark = () => {
    setQuestionTypeMarks((current) => [...current, makeEmptyQuestionTypeMark()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isViewer) return;

    if (!name.trim()) {
      setError("Give the template a name");
      return;
    }
    const questionCountValue = Number(questionCount);
    if (
      !questionCount ||
      !Number.isFinite(questionCountValue) ||
      questionCountValue <= 0
    ) {
      setError("Question count must be a whole number greater than 0");
      return;
    }

    const sectionsPayload = sections
      .map(buildSectionPayload)
      .filter(Boolean);

    // by_question_type: { <label>: { marksPerCorrect?, negativeMarksPerWrong? } }
    // - the only place a per-question-type marking scheme (as opposed to a
    // flat per-section value) can live. See
    // extraction-templates.service.js#normalizeMarkingScheme for how this
    // gets validated server-side and templateHelpers.js#buildQuestionTypeMarkPayload
    // for the row -> entry shape.
    const questionTypeMarkEntries = questionTypeMarks
      .map(buildQuestionTypeMarkPayload)
      .filter(Boolean);
    const byQuestionType = questionTypeMarkEntries.length
      ? Object.fromEntries(
          questionTypeMarkEntries.map(({ label, entry }) => [label, entry]),
        )
      : null;
    const trimmedMarkingSchemeDescription = markingSchemeDescription.trim();

    // Sent on every save (both create and edit), replacing the whole
    // settings object each time - same "full replacement, not a deep
    // merge" pattern sections/tags already use. Only include marking_scheme
    // at all when there's actually something in it, so a template with no
    // per-type overrides configured doesn't grow a settings.marking_scheme
    // key with nothing meaningful inside it.
    const settings = {
      ...(byQuestionType || trimmedMarkingSchemeDescription
        ? {
            marking_scheme: {
              ...(trimmedMarkingSchemeDescription
                ? { description: trimmedMarkingSchemeDescription }
                : {}),
              ...(byQuestionType ? { by_question_type: byQuestionType } : {}),
            },
          }
        : {}),
      ...(byQuestionType
        ? { question_types: Object.keys(byQuestionType) }
        : {}),
    };

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
      settings,
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

  return {
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
  };
}
