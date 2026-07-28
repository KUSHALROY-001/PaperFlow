import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getIssues, toEditorQuestion } from "@/utils/questionEditorHelpers";

// Extracted from pages/QuestionEditor.jsx — same behavior, plus two
// deliberate optimizations (see comments below on `issuesById` and
// `deleteQuestion`). Everything else is a straight extraction.
export function useQuestionEditor() {
  const { clusterId, mockTestId } = useParams();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialQuestionsRef = useRef([]);

  const questionsQuery = useQuery({
    queryKey: ["questions", mockTestId],
    queryFn: () => api.listQuestions(mockTestId),
    enabled: Boolean(mockTestId),
  });

  useEffect(() => {
    if (!questionsQuery.data?.questions) return;
    const loaded = questionsQuery.data.questions.map(toEditorQuestion);
    setQuestions(loaded);
    initialQuestionsRef.current = loaded;
    setHasUnsavedChanges(false);
    setSelectedId((current) =>
      loaded.some((question) => question.id === current)
        ? current
        : loaded[0]?.id || "",
    );
  }, [questionsQuery.data]);

  // Keeps a live pointer to the latest `questions` without needing to list
  // it as a dependency below — this is what lets `deleteQuestion` stay
  // referentially stable (see note on that function).
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId),
    [questions, selectedId],
  );

  const nextQuestionNo = useMemo(
    () =>
      Math.max(
        0,
        ...questions.map((question) => Number(question.questionNo) || 0),
      ) + 1,
    [questions],
  );

  // Previously `getIssues(q)` was called fresh in two places every render
  // (once per card for its badge, once again to compute the header count).
  // Computing it once here means editing one question no longer re-derives
  // issue counts for every other question on every keystroke.
  const issuesById = useMemo(() => {
    const map = new Map();
    for (const q of questions) map.set(q.id, getIssues(q));
    return map;
  }, [questions]);

  const issueCount = useMemo(
    () =>
      questions.reduce(
        (count, q) => count + (issuesById.get(q.id) > 0 ? 1 : 0),
        0,
      ),
    [questions, issuesById],
  );

  const updateSelected = useCallback(
    (field, value) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === selectedId ? { ...q, [field]: value } : q)),
      );
      setHasUnsavedChanges(true);
    },
    [selectedId],
  );

  const updateOption = useCallback(
    (i, value) => {
      if (!selected) return;
      const opts = [...selected.options];
      opts[i] = value;
      updateSelected("options", opts);
    },
    [selected, updateSelected],
  );

  const setCorrectOption = useCallback(
    (index) => {
      if (!selected) return;

      if (selected.questionType === "multi") {
        const current = new Set(selected.correctOptionIndexes);
        if (current.has(index)) {
          current.delete(index);
        } else {
          current.add(index);
        }
        updateSelected(
          "correctOptionIndexes",
          [...current].sort((a, b) => a - b),
        );
        return;
      }

      updateSelected("correctOptionIndexes", [index]);
    },
    [selected, updateSelected],
  );

  const addOption = useCallback(() => {
    if (!selected || selected.options.length >= 6) return;
    updateSelected("options", [...selected.options, ""]);
  }, [selected, updateSelected]);

  const removeOption = useCallback(
    (i) => {
      if (!selected || selected.options.length <= 2) return;
      const opts = selected.options.filter((_, j) => j !== i);
      const corrected = selected.correctOptionIndexes
        .filter((index) => index !== i)
        .map((index) => (index > i ? index - 1 : index));

      updateSelected("options", opts);
      updateSelected(
        "correctOptionIndexes",
        corrected.length ? corrected : [0],
      );
    },
    [selected, updateSelected],
  );

  const addQuestion = useCallback(() => {
    const newQ = {
      id: `draft-${Date.now()}`,
      persisted: false,
      questionNo: nextQuestionNo,
      text: "New Question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctOptionIndexes: [0],
      topic: "Data Structures",
      questionType: "single",
    };
    setQuestions((prev) => [...prev, newQ]);
    setHasUnsavedChanges(true);
    setSelectedId(newQ.id);
  }, [nextQuestionNo]);

  // Stable across renders (deps are clusterId/mockTestId/queryClient, which
  // don't change while this page is mounted) — reads the live question list
  // via questionsRef instead of closing over `questions` directly. That's
  // what lets this function keep the same identity while the user edits
  // question text, so a memoized QuestionCard list doesn't all re-render
  // on every keystroke just because this handler "changed".
  const deleteQuestion = useCallback(
    async (id) => {
      const target = questionsRef.current.find(
        (question) => question.id === id,
      );

      try {
        if (target?.persisted) {
          await api.deleteQuestion(id);
          await queryClient.invalidateQueries({
            queryKey: ["questions", mockTestId],
          });
          await queryClient.invalidateQueries({
            queryKey: ["mock-tests", clusterId],
          });
        }

        // Renumber by position so deleting from the middle doesn't leave a
        // gap (e.g. deleting #6 and #7 out of 10 used to leave 1-5, 8-10
        // instead of a clean 1-8). Computed directly from questionsRef
        // rather than inside a setState updater, so there's no dependence
        // on React's update-processing order between the two setState calls.
        const remaining = questionsRef.current
          .filter((question) => question.id !== id)
          .map((question, index) => ({ ...question, questionNo: index + 1 }));

        setQuestions(remaining);
        setSelectedId((current) =>
          current === id ? remaining[0]?.id || "" : current,
        );
      } catch (err) {
        setError(err.message || "Could not delete question");
      }
    },
    [mockTestId, clusterId, queryClient],
  );

  const saveQuestion = useCallback(
    async (question) => {
      const payload = {
        mockTestId,
        questionNo: Number(question.questionNo),
        topic: question.topic,
        questionText: question.text,
        options: question.options,
        correctOptionIndexes: question.correctOptionIndexes,
        questionType: question.questionType,
        status: "approved",
      };

      if (question.persisted) {
        return api.updateQuestion(question.id, payload);
      }

      return api.createQuestion(payload);
    },
    [mockTestId],
  );

  const handleSave = useCallback(async () => {
    setError("");
    setIsSaving(true);

    try {
      const invalid = questionsRef.current.find(
        (question) => issuesById.get(question.id) > 0,
      );
      if (invalid) {
        throw new Error("Fix question issues before saving");
      }

      for (const question of questionsRef.current) {
        await saveQuestion(question);
      }

      await queryClient.invalidateQueries({
        queryKey: ["questions", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      setSaved(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Could not save questions");
    } finally {
      setIsSaving(false);
    }
  }, [issuesById, saveQuestion, queryClient, mockTestId, clusterId]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    clusterId,
    mockTestId,
    questions,
    selected,
    selectedId,
    setSelectedId,
    saved,
    error,
    isSaving,
    isLoading: questionsQuery.isLoading,
    issuesById,
    issueCount,
    hasUnsavedChanges,
    updateSelected,
    updateOption,
    setCorrectOption,
    addOption,
    removeOption,
    addQuestion,
    deleteQuestion,
    handleSave,
  };
}
