import { useEffect, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapQuestion } from "@/utils/mockTestHelpers";

const SEARCH_DEBOUNCE_MS = 300;

// mapQuestion only returns its own fixed set of fields (built for the
// single-mock-test Output/Review tabs, which never need to say WHICH
// mock test a question is from - it's always the current one). The bank
// is cross-mock-test by definition, so every card needs to show that
// context - this wraps mapQuestion rather than editing it, since those
// extra fields would just be silently undefined noise on every other
// call site that already uses mapQuestion against a row shape that
// doesn't have them.
function mapBankQuestion(row) {
  return {
    ...mapQuestion(row),
    clusterId: row.cluster_id,
    clusterName: row.cluster_name,
    mockTestName: row.mock_test_name,
    sourceMockTestId: row.mock_test_id,
    sourceQuestionId: row.source_question_id,
    // Phase 2 additions - see question-bank.repository.js#searchQuestions
    // for how each is computed.
    usedInCount: Number(row.used_in_count) || 0,
    sourceQuestionNo: row.source_question_no ?? null,
    sourceMockTestName: row.source_mock_test_name ?? null,
    isPossibleDuplicate: Boolean(row.is_possible_duplicate),
  };
}

export function useQuestionBank() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [hasDiagram, setHasDiagram] = useState(undefined);

  const [addTarget, setAddTarget] = useState(null); // the bank question currently in the Add-to-Test modal
  const [lastMockTestId, setLastMockTestId] = useState(null); // persists across modal opens so re-adding to the same test doesn't need re-picking
  const [actionError, setActionError] = useState("");
  // Phase 3: multi-select. A plain Set of question ids, toggled per card
  // - deliberately NOT cleared when filters/search change, so switching
  // topics to gather questions from more than one topic into the same
  // bulk add still works (a selection is a cross-cutting concern, not
  // scoped to whatever the current filter happens to show).
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  // Briefly holds the id of whichever question was just copied, so its
  // card can show an inline "Added" confirmation - this codebase's
  // Toaster (components/ui/toaster.jsx) is a no-op stub, not wired to an
  // actual toast library, so this follows the same inline-confirmation
  // pattern OutputTab.jsx's Copy button already uses (flips to "Copied"
  // briefly) rather than depending on toast infrastructure that doesn't
  // exist yet.
  const [justCopiedId, setJustCopiedId] = useState(null);

  // Typing in the search box doesn't refetch per keystroke - only once
  // input has been quiet for SEARCH_DEBOUNCE_MS. searchInput (what the
  // box displays) and debouncedSearch (what actually drives the query)
  // are deliberately separate pieces of state so the input never feels
  // laggy even though the query itself is throttled.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: topicsData } = useQuery({
    queryKey: ["question-bank-topics"],
    queryFn: () => api.listQuestionBankTopics(),
  });

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      topic: topic || undefined,
      status: status || undefined,
      questionType: questionType || undefined,
      hasDiagram,
    }),
    [debouncedSearch, topic, status, questionType, hasDiagram],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ["question-bank", filters],
    queryFn: ({ pageParam }) =>
      api.searchQuestionBank({
        ...filters,
        hasDiagram: hasDiagram === undefined ? undefined : String(hasDiagram),
        cursor: pageParam,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const questions = useMemo(
    () =>
      (data?.pages || []).flatMap((page) =>
        (page.questions || []).map(mapBankQuestion),
      ),
    [data],
  );

  const handleCopy = async (questionId, targetMockTestId) => {
    try {
      setActionError("");
      await api.copyQuestionToMockTest(questionId, targetMockTestId);
      setJustCopiedId(questionId);
      setLastMockTestId(targetMockTestId);
      setTimeout(() => {
        setJustCopiedId((current) => (current === questionId ? null : current));
      }, 2000);
      // The bank's own list doesn't need invalidating (the SOURCE
      // question's row is untouched by a copy) - but the target mock
      // test just gained a question, so its workspace/cluster-level
      // counts need to refresh wherever they're shown.
      queryClient.invalidateQueries({ queryKey: ["mock-tests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      return true;
    } catch (copyError) {
      setActionError(
        copyError.message || "Could not add question to mock test",
      );
      return false;
    }
  };

  const toggleSelected = (questionId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Returns { copiedCount, failedCount } - the same shape handleCopy's
  // callers build by hand for single-question mode (see QuestionBank.jsx)
  // - so AddToTestModal has one result shape to render regardless of
  // which mode opened it, rather than single/bulk-specific branches
  // inside the modal itself.
  const handleBulkCopy = async (targetMockTestId) => {
    try {
      setActionError("");
      const ids = Array.from(selectedIds);
      const result = await api.copyQuestionsToMockTestBulk(
        ids,
        targetMockTestId,
      );
      setLastMockTestId(targetMockTestId);
      queryClient.invalidateQueries({ queryKey: ["mock-tests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });

      // Only the ones that actually failed stay selected - a successful
      // copy should disappear from the selection (nothing left to retry
      // for it), while a failure stays checked so the user can see
      // exactly what to try again without having to re-pick from
      // scratch.
      const failedIds = new Set(result.failed.map((f) => f.questionId));
      setSelectedIds(failedIds);

      return {
        copiedCount: result.copied.length,
        failedCount: result.failed.length,
      };
    } catch (bulkError) {
      setActionError(
        bulkError.message || "Could not add questions to mock test",
      );
      return { copiedCount: 0, failedCount: selectedIds.size };
    }
  };

  return {
    searchInput,
    setSearchInput,
    topic,
    setTopic,
    status,
    setStatus,
    questionType,
    setQuestionType,
    hasDiagram,
    setHasDiagram,
    topics: topicsData?.topics || [],
    questions,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
    addTarget,
    setAddTarget,
    lastMockTestId,
    actionError,
    setActionError,
    justCopiedId,
    handleCopy,
    selectedIds,
    toggleSelected,
    clearSelection,
    isBulkModalOpen,
    setIsBulkModalOpen,
    handleBulkCopy,
  };
}
