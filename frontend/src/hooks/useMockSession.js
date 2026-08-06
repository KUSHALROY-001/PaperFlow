import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

const DEFAULT_DURATION_SECONDS = 20 * 60;

export function useMockSession() {
  const { id: mockTestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [session, setSession] = useState(null); // { attempt, mockTest, questions }

  const [current, setCurrent] = useState(0);
  // questionId -> { selected: number[], saved: boolean }
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION_SECONDS);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [review, setReview] = useState(null); // getAttempt() result once submitted

  const timerRef = useRef(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // --- Start the attempt on mount ---
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setLoading(true);
        setLoadError(null);
        const result = await api.startAttempt(mockTestId);
        if (cancelled) return;
        setSession(result);
        setTimeLeft((result.mockTest?.durationMinutes || 20) * 60);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.message ||
              "Could not start this test session. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [mockTestId]);

  const questions = session?.questions || [];
  const q = questions[current];
  const answeredCount = Object.values(answers).filter(
    (a) => a.selected.length > 0,
  ).length;
  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const flushPendingAnswers = useCallback(async () => {
    const attemptId = session?.attempt?.id;
    if (!attemptId) return;

    const pending = Object.entries(answersRef.current).filter(
      ([, value]) => !value.saved,
    );
    for (const [questionId, value] of pending) {
      await api.saveAttemptAnswer(attemptId, questionId, value.selected);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], saved: true },
      }));
    }
  }, [session]);

  const handleSubmit = useCallback(async () => {
    if (!session || submitting || review) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await flushPendingAnswers();
      await api.submitAttempt(session.attempt.id);
      const reviewResult = await api.getAttempt(session.attempt.id);
      setReview(reviewResult);
    } catch (error) {
      setSubmitError(
        error.message ||
          "Could not submit your answers. Your progress is saved - please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting, review, flushPendingAnswers]);

  // --- Countdown timer ---
  useEffect(() => {
    if (!session || review) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session, review, handleSubmit]);

  // Reload / Tab Close caution alert when an active session is in progress
  useEffect(() => {
    if (!session || review || loading) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue =
        "Active test session in progress. Reloading will reset your unsubmitted session state.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session, review, loading]);

  const handleAnswer = (optionIndex) => {
    if (review || !q) return;
    const questionId = q.questionId;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected: [optionIndex], saved: false },
    }));
    api
      .saveAttemptAnswer(session.attempt.id, questionId, [optionIndex])
      .then(() => {
        setAnswers((prev) => {
          if (prev[questionId]?.selected[0] !== optionIndex) return prev;
          return {
            ...prev,
            [questionId]: { ...prev[questionId], saved: true },
          };
        });
      })
      .catch(() => {});
  };

  const toggleFlag = () => {
    if (!q) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(q.questionId)
        ? next.delete(q.questionId)
        : next.add(q.questionId);
      return next;
    });
  };

  return {
    mockTestId,
    loading,
    loadError,
    session,
    current,
    setCurrent,
    answers,
    flagged,
    timeLeft,
    submitting,
    submitError,
    review,
    questions,
    q,
    answeredCount,
    progress,
    handleSubmit,
    handleAnswer,
    toggleFlag,
  };
}
