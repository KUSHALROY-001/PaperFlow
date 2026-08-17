import { useEffect, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

const PAGE_SIZE = 20;

// One page-fetch worth of "how close to the end of what we've already
// loaded" before quietly fetching the next page in the background - kept
// small since a reviewer approving/rejecting one at a time burns through
// items fast, and refetching only once they hit the literal last loaded
// item would show a loading flicker mid-session.
const PREFETCH_THRESHOLD = 3;

// Drives the Review Queue's focus view: a flat, ordered list of
// needs_review questions across every cluster (not scoped to one mock
// test), a position pointer into that list, and the approve/reject/skip
// actions that move the pointer forward.
//
// Deliberately NOT built on top of a scrollable list + intersection
// observer, even though the underlying fetch is keyset-paginated - this
// page shows one question at a time ("23 of 47"), so "index into an
// array that grows as needed" is the right model, not infinite scroll.
export function useReviewQueue(filters) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);

  const queryKey = useMemo(
    () => [
      "review-queue",
      filters.clusterId || null,
      filters.maxConfidence ?? null,
      filters.hasAiIssues || false,
      filters.sort,
    ],
    [
      filters.clusterId,
      filters.maxConfidence,
      filters.hasAiIssues,
      filters.sort,
    ],
  );

  const queueQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      api.getReviewQueue({
        clusterId: filters.clusterId,
        maxConfidence: filters.maxConfidence,
        hasAiIssues: filters.hasAiIssues || undefined,
        sort: filters.sort,
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined,
  });

  const countKey = useMemo(
    () => [
      "review-queue-count",
      filters.clusterId || null,
      filters.maxConfidence ?? null,
      filters.hasAiIssues || false,
    ],
    [filters.clusterId, filters.maxConfidence, filters.hasAiIssues],
  );

  const countQuery = useQuery({
    queryKey: countKey,
    queryFn: () =>
      api.getReviewQueueCount({
        clusterId: filters.clusterId,
        maxConfidence: filters.maxConfidence,
        hasAiIssues: filters.hasAiIssues || undefined,
      }),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const items = useMemo(
    () => queueQuery.data?.pages.flatMap((page) => page.questions) || [],
    [queueQuery.data],
  );

  // Filters/sort changed out from under an in-progress session - reset
  // position rather than leaving the pointer stranded past the end of a
  // now-different, freshly-refetched list.
  useEffect(() => {
    setIndex(0);
  }, [queryKey]);

  const hasMorePages = queueQuery.hasNextPage;
  const isFetchingMore = queueQuery.isFetchingNextPage;

  useEffect(() => {
    if (
      index >= items.length - PREFETCH_THRESHOLD &&
      hasMorePages &&
      !isFetchingMore
    ) {
      queueQuery.fetchNextPage();
    }
    // queueQuery itself is intentionally excluded - it's a new object
    // reference every render, and fetchNextPage is stable enough via the
    // hasNextPage/isFetchingNextPage flags already in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length, hasMorePages, isFetchingMore]);

  const current = items[index] || null;
  const isQueueEmpty = !queueQuery.isLoading && items.length === 0;
  const isAtEnd =
    !queueQuery.isLoading &&
    index >= items.length &&
    !hasMorePages &&
    !isFetchingMore;

  // Removes a decided question from every cached page in place - approving
  // or rejecting takes it out of "needs_review" by definition, so it
  // shouldn't linger in the queue's own cache waiting for a full refetch.
  // The item at `index` afterward is naturally whatever came next; no
  // index bump needed here (see skip/previous below for the pointer-only
  // moves that don't remove anything).
  function removeFromCache(questionId) {
    queryClient.setQueryData(queryKey, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          questions: page.questions.filter((q) => q.id !== questionId),
        })),
      };
    });
    queryClient.setQueryData(countKey, (data) =>
      data ? { count: Math.max(0, data.count - 1) } : data,
    );
  }

  async function decide(questionId, status) {
    await api.updateQuestion(questionId, { status });
    removeFromCache(questionId);
    // Best-effort background reconcile - covers e.g. another reviewer
    // acting on the same workspace concurrently - without blocking the
    // optimistic removal the person just saw happen.
    queryClient.invalidateQueries({
      queryKey: ["review-queue"],
      refetchType: "none",
    });
  }

  // Bulk approve/reject for the list view (Phase 3). Mirrors `decide`'s
  // optimistic-removal approach, just batched: the backend only actually
  // updates rows still at needs_review (see questions.repository.js#bulkUpdateStatus),
  // so `updatedIds` may be a subset of what was requested if someone else
  // acted on one concurrently - only remove what genuinely changed, and
  // hand the full result back so the caller can tell the person if some
  // of their selection didn't go through.
  async function bulkDecide(questionIds, status) {
    const { updatedIds } = await api.bulkUpdateQuestionStatus(
      questionIds,
      status,
    );
    const updatedSet = new Set(updatedIds);
    queryClient.setQueryData(queryKey, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          questions: page.questions.filter((q) => !updatedSet.has(q.id)),
        })),
      };
    });
    queryClient.setQueryData(countKey, (data) =>
      data ? { count: Math.max(0, data.count - updatedSet.size) } : data,
    );
    queryClient.invalidateQueries({
      queryKey: ["review-queue"],
      refetchType: "none",
    });
    return updatedIds;
  }

  return {
    current,
    items,
    index,
    total: countQuery.data?.count,
    isLoading: queueQuery.isLoading || countQuery.isLoading,
    isQueueEmpty,
    isAtEnd,
    error: queueQuery.error,
    approve: (questionId) => decide(questionId, "approved"),
    reject: (questionId) => decide(questionId, "rejected"),
    bulkApprove: (questionIds) => bulkDecide(questionIds, "approved"),
    bulkReject: (questionIds) => bulkDecide(questionIds, "rejected"),
    skip: () => setIndex((i) => Math.min(i + 1, items.length)),
    previous: () => setIndex((i) => Math.max(i - 1, 0)),
    resetPosition: () => setIndex(0),
    hasMore: hasMorePages,
    isFetchingMore,
    loadMore: () => queueQuery.fetchNextPage(),
  };
}
