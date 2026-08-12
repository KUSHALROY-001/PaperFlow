import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const DEFAULT_DURATION_SECONDS = 20 * 60;
export const PENDING_CLAIM_KEY = "paperflow_pending_claim";

/*
 * Single hook powering both exam-taking entry points:
 *   - mode: 'member' -> /session/:id  (logged in, /api/attempts, requireAuth)
 *   - mode: 'guest'  -> /shared/:token (public, /api/shared, token-scoped)
 *
 * The two used to be entirely separate hooks (useMockSession / useSharedMock)
 * with near-identical state shape and only the underlying API calls
 * differing. This keeps that one shape and swaps the API calls by mode, so
 * both pages/components can render from the same state without caring which
 * flow they're in.
 *
 * Guest mode adds two things member mode doesn't need:
 *   - an 'intro' phase (collect a display name before starting - there's no
 *     equivalent for a member, who's already identified)
 *   - on successful submit, stashes { attemptId, shareToken } in
 *     sessionStorage so the results screen can offer "log in to save this
 *     result" and, if the guest does, AuthPage can claim the attempt after
 *     login/signup (see PENDING_CLAIM_KEY).
 */
export function useExamSession({ mode }) {
  const params = useParams();
  const mockTestId = mode === "member" ? params.id : undefined;
  const shareToken = mode === "guest" ? params.token : undefined;
  const { isAuthenticated } = useAuth();

  // 'guest' starts at 'loading' -> 'intro' (collect name) -> 'session' -> 'result'
  // 'member' only ever uses 'session' (loading is tracked separately below,
  // to match how MockSession.jsx already renders) -> 'result'
  const [phase, setPhase] = useState(mode === "guest" ? "loading" : "session");
  const [loading, setLoading] = useState(mode === "member");
  const [loadError, setLoadError] = useState(null);

  const [mockTestInfo, setMockTestInfo] = useState(null); // guest only: getSharedMockTest() result
  const [name, setName] = useState(""); // guest only
  const [starting, setStarting] = useState(false); // guest only
  const [startError, setStartError] = useState(null); // guest only

  const [session, setSession] = useState(null); // { attempt, mockTest, questions }
  const [current, setCurrent] = useState(0);
  // questionId -> { selected: number[], saved: boolean }
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION_SECONDS);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [review, setReview] = useState(null); // attempt result once submitted

  const [claimStatus, setClaimStatus] = useState("idle"); // idle | claiming | saved | error

  const timerRef = useRef(null);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // --- Member mode: start the attempt immediately on mount ---
  useEffect(() => {
    if (mode !== "member") return;
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
  }, [mode, mockTestId]);

  // --- Guest mode: load the shared test's public info on mount ---
  useEffect(() => {
    if (mode !== "guest") return;
    let cancelled = false;

    async function load() {
      try {
        const result = await api.getSharedMockTest(shareToken);
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
  }, [mode, shareToken]);

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
      if (mode === "guest") {
        await api.saveSharedAnswer(
          shareToken,
          attemptId,
          questionId,
          value.selected,
        );
      } else {
        await api.saveAttemptAnswer(attemptId, questionId, value.selected);
      }
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], saved: true },
      }));
    }
  }, [session, mode, shareToken]);

  const handleSubmit = useCallback(async () => {
    if (!session || submitting || review) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await flushPendingAnswers();
      const attemptId = session.attempt.id;
      let reviewResult;
      if (mode === "guest") {
        await api.submitSharedAttempt(shareToken, attemptId);
        reviewResult = await api.getSharedAttempt(shareToken, attemptId);
        // Stash for a possible "log in to save this result" claim later -
        // see PENDING_CLAIM_KEY / AuthPage.jsx.
        sessionStorage.setItem(
          PENDING_CLAIM_KEY,
          JSON.stringify({ attemptId, shareToken }),
        );
      } else {
        await api.submitAttempt(attemptId);
        reviewResult = await api.getAttempt(attemptId);
      }
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
  }, [session, submitting, review, flushPendingAnswers, mode, shareToken]);

  // --- Countdown timer ---
  useEffect(() => {
    if (!session || review || phase !== "session") return;
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
  }, [session, review, phase, handleSubmit]);

  // Reload / Tab Close caution alert when an active session is in progress
  useEffect(() => {
    if (!session || review || loading || phase !== "session") return;

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
  }, [session, review, loading, phase]);

  const handleStart = async () => {
    // guest-only: called from the intro screen once a name is entered
    if (!name.trim() || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const result = await api.startSharedAttempt(shareToken, name.trim());
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
    if (review || !q) return;
    const questionId = q.questionId;
    const attemptId = session.attempt.id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected: [optionIndex], saved: false },
    }));
    const save =
      mode === "guest"
        ? api.saveSharedAnswer(shareToken, attemptId, questionId, [optionIndex])
        : api.saveAttemptAnswer(attemptId, questionId, [optionIndex]);
    save
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

  // guest-only: "log in to save this result" from the results screen, for
  // a guest who was ALREADY authenticated at submit time (rare, but
  // possible if they logged in another tab) - claims immediately instead
  // of round-tripping through AuthPage's PENDING_CLAIM handling.
  const claimResult = useCallback(async () => {
    if (mode !== "guest" || !session?.attempt?.id || !isAuthenticated) return;
    setClaimStatus("claiming");
    try {
      await api.claimSharedAttempt(shareToken, session.attempt.id);
      sessionStorage.removeItem(PENDING_CLAIM_KEY);
      setClaimStatus("saved");
    } catch {
      setClaimStatus("error");
    }
  }, [mode, session, shareToken, isAuthenticated]);

  // Best-effort abandon on cancel. Without this, the exam_attempts row
  // created at session start (status='in_progress') just sits there
  // forever - it'd show up as a permanently "In progress" card both in
  // the taker's own My Results and in the mock test owner's Submissions
  // tab, with no way to tell a genuinely-still-running session apart
  // from one the person walked away from minutes ago. Still lets the
  // person leave even if this call fails - cancelling shouldn't be
  // blocked by a network hiccup.
  const handleCancelSession = useCallback(async () => {
    const attemptId = session?.attempt?.id;
    if (!attemptId || review) return;
    clearInterval(timerRef.current);
    try {
      if (mode === "guest") {
        await api.abandonSharedAttempt(shareToken, attemptId);
      } else {
        await api.abandonAttempt(attemptId);
      }
    } catch {
      // Swallow - see comment above.
    }
  }, [session, review, mode, shareToken]);

  return {
    mode,
    mockTestId,
    shareToken,
    phase,
    loading,
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
    answeredCount,
    progress,
    isAuthenticated,
    claimStatus,
    handleStart,
    handleSubmit,
    handleAnswer,
    toggleFlag,
    claimResult,
    handleCancelSession,
  };
}
