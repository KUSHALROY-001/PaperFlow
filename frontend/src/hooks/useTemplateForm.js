import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import {
  CATEGORY_OPTIONS,
  buildSectionPayload,
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
    error,
    isSubmitting,
    handleSubmit,
  };
}
