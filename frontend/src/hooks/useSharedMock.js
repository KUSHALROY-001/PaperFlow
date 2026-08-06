import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

export function useSharedMock() {
  const { token } = useParams();

  const [phase, setPhase] = useState("loading"); // loading | error | intro | session | result
  const [loadError, setLoadError] = useState(null);
  const [mockTestInfo, setMockTestInfo] = useState(null); // getSharedMockTest() result

  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  const [session, setSession] = useState(null); // startSharedAttempt() result
  const [current, setCurrent] = useState(0);
  // questionId -> { selected: number[], saved: boolean }
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(20 * 60);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [review, setReview] = useState(null);

  const timerRef = useRef(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // --- Load the shared test's public info on mount ---
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await api.getSharedMockTest(token);
        if (cancelled) return;
        setMockTestInfo(result);
        setPhase("intro");
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "This link is invalid or has expired.");
          setPhase("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const questions = session?.questions || [];
  const q = questions[current];

  const flushPendingAnswers = useCallback(async () => {
    const attemptId = session?.attempt?.id;
    if (!attemptId) return;
    const pending = Object.entries(answersRef.current).filter(
      ([, value]) => !value.saved,
    );
    for (const [questionId, value] of pending) {
      await api.saveSharedAnswer(token, attemptId, questionId, value.selected);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], saved: true },
      }));
    }
  }, [session, token]);

  const handleSubmit = useCallback(async () => {
    if (!session || submitting || review) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await flushPendingAnswers();
      await api.submitSharedAttempt(token, session.attempt.id);
      const reviewResult = await api.getSharedAttempt(
        token,
        session.attempt.id,
      );
      setReview(reviewResult);
      setPhase("result");
    } catch (error) {
      setSubmitError(
        error.message ||
          "Could not submit your answers. Your progress is saved - please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting, review, flushPendingAnswers, token]);

  useEffect(() => {
    if (phase !== "session") return;
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
  }, [phase, handleSubmit]);

  const handleStart = async () => {
    if (!name.trim() || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const result = await api.startSharedAttempt(token, name.trim());
      setSession(result);
      setTimeLeft((result.mockTest?.durationMinutes || 20) * 60);
      setPhase("session");
    } catch (error) {
      setStartError(
        error.message || "Could not start the test. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  };

  const handleAnswer = (optionIndex) => {
    if (!q) return;
    const questionId = q.questionId;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected: [optionIndex], saved: false },
    }));
    api
      .saveSharedAnswer(token, session.attempt.id, questionId, [optionIndex])
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
      const n = new Set(prev);
      n.has(q.questionId) ? n.delete(q.questionId) : n.add(q.questionId);
      return n;
    });
  };

  return {
    token,
    phase,
    loadError,
    mockTestInfo,
    name,
    setName,
    starting,
    startError,
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
    handleStart,
    handleSubmit,
    handleAnswer,
    toggleFlag,
  };
}
