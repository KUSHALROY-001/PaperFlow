import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getIssues, toEditorQuestion } from "@/utils/questionEditorHelpers";

export function useQuestionEditor() {
  const { clusterId, mockTestId } = useParams();
  const [searchParams] = useSearchParams();
  const targetQId = searchParams.get("qId") || searchParams.get("questionId");

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
    setSelectedId((current) => {
      if (targetQId && loaded.some((q) => q.id === targetQId)) {
        return targetQId;
      }
      return loaded.some((question) => question.id === current)
        ? current
        : loaded[0]?.id || "";
    });
  }, [questionsQuery.data, targetQId]);

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  // Dynamically collect unique topics extracted from questions in this mock test
  const extractedTopics = useMemo(() => {
    const set = new Set();
    for (const q of questions) {
      if (q.topic && q.topic.trim()) {
        set.add(q.topic.trim());
      }
    }
    return Array.from(set);
  }, [questions]);

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
    const defaultTopic = extractedTopics[0] || "General";
    const newQ = {
      id: `draft-${Date.now()}`,
      persisted: false,
      questionNo: nextQuestionNo,
      text: "New Question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctOptionIndexes: [0],
      topic: defaultTopic,
      questionType: "single",
    };
    setQuestions((prev) => [...prev, newQ]);
    setHasUnsavedChanges(true);
    setSelectedId(newQ.id);
  }, [nextQuestionNo, extractedTopics]);

  // DIRECT 2-ITEM SWAP: Swaps position of draggedIndex and targetIndex directly
  // (e.g. item 1 and item 5 swap places directly; items 2, 3, 4 remain unchanged).
  const reorderQuestions = useCallback((draggedIndex, targetIndex) => {
    if (
      draggedIndex === undefined ||
      targetIndex === undefined ||
      draggedIndex === null ||
      targetIndex === null ||
      draggedIndex === targetIndex
    ) {
      return;
    }

    setQuestions((prev) => {
      const list = [...prev];
      // Direct swap between dragged item and target item
      const temp = list[draggedIndex];
      list[draggedIndex] = list[targetIndex];
      list[targetIndex] = temp;

      // Update question numbers sequentially (1, 2, 3...)
      return list.map((q, idx) => ({
        ...q,
        questionNo: idx + 1,
      }));
    });

    setHasUnsavedChanges(true);
  }, []);

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
        subtopic: question.subtopic || null,
        passage: question.passage || null,
        explanation: question.explanation || null,
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

      // First reorder all existing persisted questions in a single atomic transaction
      const persistedItems = questionsRef.current
        .filter((q) => q.persisted)
        .map((q) => ({ id: q.id, questionNo: Number(q.questionNo) }));

      if (persistedItems.length > 0) {
        await api.reorderQuestions(mockTestId, persistedItems);
      }

      // Then save question content edits and create draft questions
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
    extractedTopics,
    hasUnsavedChanges,
    updateSelected,
    updateOption,
    setCorrectOption,
    addOption,
    removeOption,
    addQuestion,
    deleteQuestion,
    reorderQuestions,
    handleSave,
  };
}
