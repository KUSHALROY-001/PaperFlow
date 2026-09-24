import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const QUESTIONS_PAGE_SIZE = 50;

/**
 * Loads a mock test's questions in fixed-size pages. Callers can either
 * drain the available rows automatically or request more rows explicitly.
 *
 * The point is the live case: worker.py now commits extracted questions in
 * batches of 30 (see config.py#QUESTION_WRITE_BATCH_SIZE), so those rows are
 * queryable long before the job reports "completed". `total` is meant to be
 * fed from the polled /questions/stats count - every time it grows, this
 * hook fetches the rows that appeared and appends them, so Review and Output
 * fill in as the extraction happens rather than staying empty and then
 * dumping 3000 questions at the end.
 *
 * Offset paging is safe here because a job's save only ever appends: the
 * previous extraction is deleted once, up front (db.py#delete_existing_
 * questions), and the batches after it insert in ascending question_no and
 * are never revised. The id-based dedupe below is belt-and-braces for the
 * one moment that ISN'T append-only - a local delete shrinking the list
 * under a stale `total`.
 *
 * @param {string} mockTestId
 * @param {object} options
 * @param {boolean} options.enabled Skip entirely (e.g. tab not open).
 * @param {boolean} options.autoLoad Drain all available pages automatically.
 * @param {number} options.total Authoritative row count from the server.
 * @param {string} options.resetToken Changing this restarts from offset 0.
 */
export function useStreamingQuestions(
  mockTestId,
  { enabled = true, autoLoad = true, total = 0, resetToken = null, includeStale = false } = {},
) {
  const [questions, setQuestions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const [requestedCount, setRequestedCount] = useState(QUESTIONS_PAGE_SIZE);

  const inFlightRef = useRef(false);
  const streamKeyRef = useRef(null);
  // Remembers an (offset, total) pair that already came back empty or
  // errored, so a server that disagrees with the stats count for a moment
  // can't put this hook in a request loop. Cleared as soon as either
  // number moves.
  const blockedRef = useRef(null);

  const streamKey = `${mockTestId || ""}::${resetToken ?? ""}::${includeStale}`;

  // Full restart: different mock test, or the caller signalled that what's
  // on the server has been replaced rather than appended to. The second
  // case is why resetToken exists - when a job finishes, the worker's
  // post-save passes (duplicate detection, and the bounded near-duplicate
  // regeneration that rewrites slot content in place) can change rows this
  // hook already streamed in, so the completed list has to be re-read
  // rather than trusted from the live stream.
  useEffect(() => {
    if (streamKeyRef.current === streamKey) return;
    streamKeyRef.current = streamKey;
    inFlightRef.current = false;
    blockedRef.current = null;
    setQuestions([]);
    setError("");
    setRequestedCount(QUESTIONS_PAGE_SIZE);
  }, [streamKey]);

  useEffect(() => {
    // The list got shorter than what we hold - a reprocess wiped the old
    // extraction, or a question was deleted. Offsets from here on would be
    // meaningless, so start over.
    if (total < questions.length) {
      blockedRef.current = null;
      setQuestions([]);
      setRequestedCount(QUESTIONS_PAGE_SIZE);
    }
  }, [total, questions.length]);

  useEffect(() => {
    if (!enabled || !mockTestId) return undefined;
    if (inFlightRef.current) return undefined;

    const offset = questions.length;
    const targetCount = autoLoad ? total : Math.min(requestedCount, total);
    if (offset >= targetCount) return undefined;

    const blocked = blockedRef.current;
    if (blocked && blocked.offset === offset && blocked.total === total) {
      return undefined;
    }

    let cancelled = false;
    inFlightRef.current = true;
    setIsFetching(true);

    api
      .listQuestions(mockTestId, { limit: QUESTIONS_PAGE_SIZE, offset, includeStale })
      .then((page) => {
        if (cancelled) return;
        const incoming = Array.isArray(page?.questions) ? page.questions : [];
        if (!Array.isArray(page?.questions)) {
          // Do not allow an unexpected response shape to take down the
          // workspace render. The server contract is always an array here.
          blockedRef.current = { offset, total };
          setError("Could not load questions: invalid server response");
          return;
        }
        if (incoming.length === 0) {
          // Stats said there were more rows than this returned. Wait for
          // the next `total` before asking again.
          blockedRef.current = { offset, total };
          return;
        }
        setError("");
        setQuestions((prev) => {
          const seen = new Set(prev.map((question) => question.id));
          const appended = [
            ...prev,
            ...incoming.filter((question) => !seen.has(question.id)),
          ];
          // The stream is append-ordered already; this only matters after
          // a local edit reshuffles things.
          return appended.sort(
            (a, b) => (Number(a.question_no) || 0) - (Number(b.question_no) || 0),
          );
        });
      })
      .catch((requestError) => {
        if (cancelled) return;
        blockedRef.current = { offset, total };
        setError(requestError?.message || "Could not load questions");
      })
      .finally(() => {
        if (cancelled) return;
        inFlightRef.current = false;
        setIsFetching(false);
      });

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
    // questions.length is a dependency on purpose: in automatic mode it
    // drains the list page by page; in manual mode it stops when it reaches
    // the caller's requested page boundary.
  }, [autoLoad, enabled, mockTestId, requestedCount, total, questions.length, includeStale]);

  const loadMoreQuestions = useCallback(() => {
    blockedRef.current = null;
    setRequestedCount((current) =>
      Math.max(
        current,
        Math.min(total, Math.max(current, questions.length) + QUESTIONS_PAGE_SIZE),
      ),
    );
  }, [questions.length, total]);

  const loadThroughQuestion = useCallback(
    (questionNo) => {
      if (!Number.isInteger(questionNo) || questionNo < 1 || questionNo > total) {
        return false;
      }

      blockedRef.current = null;
      setRequestedCount((current) =>
        Math.max(
          current,
          Math.min(
            total,
            Math.ceil(questionNo / QUESTIONS_PAGE_SIZE) * QUESTIONS_PAGE_SIZE,
          ),
        ),
      );
      return true;
    },
    [total],
  );

  // Local, optimistic edits. These exist so approving or deleting a single
  // question doesn't have to throw away a 3000-row stream and re-read it.
  const patchQuestion = useCallback((questionId, patch) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    );
  }, []);

  const removeQuestion = useCallback((questionId) => {
    setQuestions((prev) => prev.filter((question) => question.id !== questionId));
  }, []);

  return {
    questions,
    // Manual consumers intentionally stop at a requested page boundary.
    // Automatic consumers keep their existing "drain all pages" behavior.
    isStreaming: isFetching || (autoLoad && questions.length < total),
    loadedCount: questions.length,
    totalCount: total,
    error,
    hasMoreQuestions: questions.length < total,
    loadMoreQuestions,
    loadThroughQuestion,
    patchQuestion,
    removeQuestion,
  };
}
