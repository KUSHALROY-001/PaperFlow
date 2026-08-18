import { BookMarked, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { EmptyState } from "../components/design-system/EmptyState";
import BankFilters from "../components/question-bank/BankFilters";
import BankQuestionCard from "../components/question-bank/BankQuestionCard";
import AddToTestModal from "../components/question-bank/AddToTestModal";
import QuestionBankIntroCard from "../components/question-bank/QuestionBankIntroCard";

export default function QuestionBank() {
  const { isViewer } = useAuth();

  const {
    searchInput,
    setSearchInput,
    topic,
    setTopic,
    status,
    setStatus,
    questionType,
    setQuestionType,
    hasCode,
    setHasCode,
    hasDiagram,
    setHasDiagram,
    topics,
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
  } = useQuestionBank();

  const closeModal = () => {
    setAddTarget(null);
    setIsBulkModalOpen(false);
    setActionError("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <QuestionBankIntroCard />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
          <BookMarked className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            Question Bank
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Every question ever extracted in this workspace, searchable across
            clusters and mock tests.
          </p>
        </div>
      </div>

      <BankFilters
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        topic={topic}
        setTopic={setTopic}
        status={status}
        setStatus={setStatus}
        questionType={questionType}
        setQuestionType={setQuestionType}
        hasCode={hasCode}
        setHasCode={setHasCode}
        hasDiagram={hasDiagram}
        setHasDiagram={setHasDiagram}
        topics={topics}
      />

      {error && (
        <p className="text-xs font-bold text-red-500">
          {error.message || "Could not load the question bank"}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No questions match these filters"
          description="Try clearing a filter or searching a different term - the bank covers every question extracted across every mock test in this workspace."
        />
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <BankQuestionCard
              key={question.id}
              question={question}
              onAddToTest={setAddTarget}
              isViewer={isViewer}
              justCopied={justCopiedId === question.id}
              isSelected={selectedIds.has(question.id)}
              onToggleSelect={toggleSelected}
            />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className={`px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-card transition-all ${
                  isFetchingNextPage
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 3: sticky bar, only shown once something's selected -
          stays out of the way otherwise. Fixed to the bottom rather than
          inline with the filter bar so it stays reachable while scrolled
          deep into a long result list, the same reason a shopping cart
          bar usually docks to an edge of the screen rather than living at
          the top where you'd have to scroll back up to it. */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
          <div className="surface-card border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-bold text-foreground flex-1">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              type="button"
              disabled={isViewer}
              onClick={() => !isViewer && setIsBulkModalOpen(true)}
              title={
                isViewer
                  ? "Editor role is required to add questions"
                  : undefined
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                isViewer
                  ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                  : "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
              }`}
            >
              <Plus className="w-4 h-4" /> Add to Test
            </button>
          </div>
        </div>
      )}

      {addTarget && (
        <AddToTestModal
          summary={`Q${addTarget.questionNo}: ${addTarget.text}`}
          resetKey={addTarget.id}
          lastMockTestId={lastMockTestId}
          isViewer={isViewer}
          actionError={actionError}
          onClose={closeModal}
          onConfirm={async (targetMockTestId) => {
            const ok = await handleCopy(addTarget.id, targetMockTestId);
            return { copiedCount: ok ? 1 : 0, failedCount: ok ? 0 : 1 };
          }}
        />
      )}

      {isBulkModalOpen && (
        <AddToTestModal
          summary={`${selectedIds.size} question${selectedIds.size === 1 ? "" : "s"} selected`}
          resetKey="bulk"
          lastMockTestId={lastMockTestId}
          isViewer={isViewer}
          actionError={actionError}
          onClose={closeModal}
          onConfirm={handleBulkCopy}
        />
      )}
    </div>
  );
}
