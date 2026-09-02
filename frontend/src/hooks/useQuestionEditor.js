import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getIssues, toEditorQuestion } from "@/utils/questionEditorHelpers";

/**
 * Content-only fingerprint (excludes questionNo / order and ephemeral UI
 * fields). Used to decide whether a single question needs a PATCH without
 * treating pure swaps as content edits.
 */
function contentFingerprint(question) {
  return JSON.stringify({
    text: question.text ?? "",
    options: question.options ?? [],
    correctOptionIndexes: question.correctOptionIndexes ?? [],
    topic: question.topic ?? "",
    subtopic: question.subtopic ?? "",
    passage: question.passage ?? "",
    explanation: question.explanation ?? "",
    questionType: question.questionType ?? "single",
    marksPerCorrect: question.marksPerCorrect ?? null,
    negativeMarksPerWrong: question.negativeMarksPerWrong ?? null,
  });
}

function buildInitialSnapshot(questions) {
  const byId = new Map();
  for (const q of questions) {
    byId.set(q.id, {
      content: contentFingerprint(q),
      questionNo: Number(q.questionNo) || 0,
      persisted: Boolean(q.persisted),
    });
  }
  return byId;
}

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
  // Snapshot of last-loaded / last-saved server state, keyed by question id.
  const initialSnapshotRef = useRef(new Map());
  const hasLoadedOnceRef = useRef(false);
  // Tracks which mockTestId hasLoadedOnceRef applies to, so switching
  // tests re-runs the initial-load path (including ?qId= deep-link).
  const loadedMockTestIdRef = useRef(null);

  const questionsQuery = useQuery({
    queryKey: ["questions", mockTestId],
    queryFn: () => api.listQuestions(mockTestId),
    enabled: Boolean(mockTestId),
  });

  const mockTestQuery = useQuery({
    queryKey: ["mock-test", mockTestId],
    queryFn: () => api.getMockTest(mockTestId),
    enabled: Boolean(mockTestId),
  });
  const mockTest = mockTestQuery.data?.mockTest || mockTestQuery.data || null;
  const paperDefaultMarks =
    mockTest?.marks_per_correct ?? mockTest?.marksPerCorrect ?? null;
  const paperDefaultNegative =
    mockTest?.negative_marks_per_wrong ??
    mockTest?.negativeMarksPerWrong ??
    null;

  useEffect(() => {
    if (!questionsQuery.data?.questions) return;
    const loaded = questionsQuery.data.questions.map(toEditorQuestion);
    const isFirstLoadForMock =
      loadedMockTestIdRef.current !== mockTestId || !hasLoadedOnceRef.current;

    if (isFirstLoadForMock) {
      hasLoadedOnceRef.current = true;
      loadedMockTestIdRef.current = mockTestId;
      initialSnapshotRef.current = buildInitialSnapshot(loaded);
      setQuestions(loaded);
      // Initial open (or switched mock test): honour Review/Output ?qId=
      // deep-link when present; otherwise first question.
      setSelectedId((current) => {
        if (targetQId && loaded.some((q) => q.id === targetQId)) {
          return targetQId;
        }
        if (current && loaded.some((q) => q.id === current)) return current;
        return loaded[0]?.id || "";
      });
      return;
    }

    // Subsequent refetches (diagram upload, soft-invalidate after save):
    // keep the user's current selection, keep unsaved content/order, but
    // always take fresh diagram fields from the server so a PDF-fetch
    // upload is not wiped by the merge.
    setQuestions((prev) => {
      const prevById = new Map(prev.map((q) => [q.id, q]));
      const snap = initialSnapshotRef.current;
      return loaded.map((serverQ) => {
        const local = prevById.get(serverQ.id);
        if (!local) return serverQ;
        const entry = snap.get(serverQ.id);
        const isContentDirty =
          !entry ||
          !local.persisted ||
          contentFingerprint(local) !== entry.content;
        const isOrderDirty =
          Boolean(entry) &&
          Number(local.questionNo) !== Number(entry.questionNo);
        if (!isContentDirty && !isOrderDirty) return serverQ;
        return {
          ...serverQ,
          ...(isContentDirty
            ? {
                text: local.text,
                options: local.options,
                correctOptionIndexes: local.correctOptionIndexes,
                topic: local.topic,
                subtopic: local.subtopic,
                passage: local.passage,
                explanation: local.explanation,
                questionType: local.questionType,
                marksPerCorrect: local.marksPerCorrect,
                negativeMarksPerWrong: local.negativeMarksPerWrong,
              }
            : {}),
          ...(isOrderDirty ? { questionNo: local.questionNo } : {}),
        };
      });
    });

    // Prefer staying on whatever the user is viewing. Only fall back to
    // ?qId= / first question when the current selection is gone (deleted).
    setSelectedId((current) => {
      if (current && loaded.some((q) => q.id === current)) return current;
      if (targetQId && loaded.some((q) => q.id === targetQId)) return targetQId;
      return loaded[0]?.id || "";
    });
  }, [questionsQuery.data, targetQId, mockTestId]);

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

  /**
   * Derive which questions are dirty (content and/or order) vs the last
   * successful load/save snapshot. Swaps only touch order; field edits only
   * touch content. New drafts are always content-dirty.
   */
  const { dirtyContentIds, orderChangedItems, hasUnsavedChanges, selectedIsDirty } =
    useMemo(() => {
      const snapshot = initialSnapshotRef.current;
      const contentIds = new Set();
      const orderItems = [];

      for (const q of questions) {
        const prev = snapshot.get(q.id);
        if (!prev || !q.persisted) {
          // Draft or unknown id → must be created / treated as content dirty
          contentIds.add(q.id);
          continue;
        }
        if (contentFingerprint(q) !== prev.content) {
          contentIds.add(q.id);
        }
        const currentNo = Number(q.questionNo) || 0;
        if (currentNo !== prev.questionNo) {
          orderItems.push({ id: q.id, questionNo: currentNo });
        }
      }

      // Also: questions that existed in snapshot but were deleted locally
      // are handled by deleteQuestion (immediate API), so not tracked here.

      const dirty =
        contentIds.size > 0 ||
        orderItems.length > 0;

      // Enable "Save" when the selection has content edits, OR when any
      // reorder is pending (save-one always flushes the full order delta,
      // which is typically just the two swapped rows — cheap).
      const selectedDirty =
        Boolean(selectedId) &&
        (contentIds.has(selectedId) || orderItems.length > 0);

      return {
        dirtyContentIds: contentIds,
        orderChangedItems: orderItems,
        hasUnsavedChanges: dirty,
        selectedIsDirty: selectedDirty,
      };
    }, [questions, selectedId]);

  // Keep refs so async save handlers always see the latest dirty sets
  const dirtyContentIdsRef = useRef(dirtyContentIds);
  dirtyContentIdsRef.current = dirtyContentIds;
  const orderChangedItemsRef = useRef(orderChangedItems);
  orderChangedItemsRef.current = orderChangedItems;

  const updateSelected = useCallback(
    (fieldOrPatch, value) => {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== selectedId) return q;
          if (typeof fieldOrPatch === "object" && fieldOrPatch !== null) {
            return { ...q, ...fieldOrPatch };
          }
          return { ...q, [fieldOrPatch]: value };
        }),
      );
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
        // Drop deleted id from snapshot; remaining order will be dirty until save
        initialSnapshotRef.current.delete(id);
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
        marksPerCorrect: question.marksPerCorrect ?? null,
        negativeMarksPerWrong: question.negativeMarksPerWrong ?? null,
        status: "approved",
      };

      if (question.persisted) {
        return api.updateQuestion(question.id, payload);
      }

      return api.createQuestion(payload);
    },
    [mockTestId],
  );

  /**
   * After a successful save, mark the given questions (and optional order
   * items) as clean in the snapshot so hasUnsavedChanges shrinks without
   * a full refetch. For brand-new drafts we still invalidate so the
   * server-assigned id replaces `draft-*`.
   */
  const markSnapshotClean = useCallback((savedQuestions, orderItems = []) => {
    const snap = initialSnapshotRef.current;
    for (const q of savedQuestions) {
      if (!q.persisted) continue; // draft still has temp id until refetch
      snap.set(q.id, {
        content: contentFingerprint(q),
        questionNo: Number(q.questionNo) || 0,
        persisted: true,
      });
    }
    for (const item of orderItems) {
      const existing = snap.get(item.id);
      if (existing) {
        snap.set(item.id, {
          ...existing,
          questionNo: Number(item.questionNo) || 0,
        });
      }
    }
    // Force re-render so derived dirty flags update
    setQuestions((prev) => [...prev]);
  }, []);

  /**
   * Persist only the questions whose questionNo moved (from swaps). The
   * backend two-pass UPDATE handles unique constraints even for a partial
   * list, so we never need to ship all 170 rows for a single swap.
   */
  const persistOrderChanges = useCallback(
    async (orderItems) => {
      if (!orderItems?.length) return;
      await api.reorderQuestions(mockTestId, orderItems);
    },
    [mockTestId],
  );

  /**
   * Save ONE: current selection only.
   *
   * Swap handling: if any questions were reordered (including the selected
   * one or others), we first send ONLY the changed {id, questionNo} pairs
   * via reorder. Then we PATCH/create the selected question if its content
   * (or draft status) is dirty. Other questions' content is left alone.
   */
  const handleSave = useCallback(async () => {
    setError("");
    setIsSaving(true);

    try {
      const current = questionsRef.current.find((q) => q.id === selectedId);
      if (!current) {
        throw new Error("No question selected");
      }

      if (issuesById.get(current.id) > 0) {
        throw new Error("Fix issues on this question before saving");
      }

      const orderItems = orderChangedItemsRef.current;
      const contentDirty = dirtyContentIdsRef.current.has(current.id);

      // 1) Minimal order sync (only ids whose questionNo changed)
      if (orderItems.length > 0) {
        await persistOrderChanges(orderItems);
      }

      // 2) Content for the selected question only (skip if pure reorder)
      let createdNeedsRefetch = false;
      if (contentDirty || !current.persisted) {
        await saveQuestion(current);
        if (!current.persisted) {
          createdNeedsRefetch = true;
        }
      }

      if (createdNeedsRefetch) {
        // New row got a real id from the server — full list refresh is the
        // simplest way to pick it up and replace draft-* in local state.
        await queryClient.invalidateQueries({
          queryKey: ["questions", mockTestId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["mock-tests", clusterId],
        });
      } else {
        markSnapshotClean(
          contentDirty || orderItems.some((i) => i.id === current.id)
            ? [current]
            : [],
          orderItems,
        );
        // Soft-invalidate so other views stay fresh without blocking UI
        void queryClient.invalidateQueries({
          queryKey: ["questions", mockTestId],
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Could not save question");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedId,
    issuesById,
    saveQuestion,
    persistOrderChanges,
    markSnapshotClean,
    queryClient,
    mockTestId,
    clusterId,
  ]);

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
    selectedIsDirty,
    dirtyContentCount: dirtyContentIds.size,
    orderChangeCount: orderChangedItems.length,
    updateSelected,
    updateOption,
    setCorrectOption,
    addOption,
    removeOption,
    addQuestion,
    deleteQuestion,
    reorderQuestions,
    handleSave,
    paperDefaultMarks,
    paperDefaultNegative,
    mockTest,
  };
}
