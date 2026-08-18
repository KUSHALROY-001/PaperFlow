import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Layers, ListTodo, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import QueueProgressBar from "../components/review-queue/QueueProgressBar";
import QueueQuestionCard from "../components/review-queue/QueueQuestionCard";
import QueueListView from "../components/review-queue/QueueListView";
import QueueEmptyState from "../components/review-queue/QueueEmptyState";
import ReviewQueueIntroCard from "../components/review-queue/ReviewQueueIntroCard";

const SORT_OPTIONS = [
  { value: "confidence_asc", label: "Lowest confidence first" },
  { value: "question_no_asc", label: "Question number" },
  { value: "created_at_desc", label: "Most recently extracted" },
];

export default function ReviewQueue() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [clusterId, setClusterId] = useState("");
  const [maxConfidence, setMaxConfidence] = useState("");
  const [hasAiIssues, setHasAiIssues] = useState(false);
  const [sort, setSort] = useState("confidence_asc");
  const [actionError, setActionError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [viewMode, setViewMode] = useState("focus");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const { data: clustersData } = useQuery({
    queryKey: ["clusters"],
    queryFn: api.listClusters,
  });
  const clusters = clustersData?.clusters || [];

  const filters = useMemo(
    () => ({
      clusterId: clusterId || undefined,
      maxConfidence: maxConfidence === "" ? undefined : Number(maxConfidence),
      hasAiIssues,
      sort,
    }),
    [clusterId, maxConfidence, hasAiIssues, sort],
  );

  const {
    current,
    items,
    index,
    total,
    isLoading,
    isQueueEmpty,
    isAtEnd,
    error,
    approve,
    reject,
    bulkApprove,
    bulkReject,
    skip,
    resetPosition,
    hasMore,
    isFetchingMore,
    loadMore,
  } = useReviewQueue(filters);

  // Selection is inherently tied to what's currently loaded - switching
  // filters/sort or hopping between Focus and List should never leave a
  // stale selection pointing at questions no longer in view.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, viewMode]);

  const hasActiveFilters = Boolean(
    clusterId || maxConfidence !== "" || hasAiIssues,
  );

  const filterSummary = useMemo(() => {
    const parts = [];
    if (clusterId) {
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster) parts.push(cluster.name);
    }
    if (maxConfidence !== "") parts.push(`below ${maxConfidence}%`);
    if (hasAiIssues) parts.push("flagged by AI");
    return parts.join(" · ") || null;
  }, [clusterId, maxConfidence, hasAiIssues, clusters]);

  const handleApprove = async (questionId) => {
    setActionError("");
    setIsBusy(true);
    try {
      await approve(questionId);
    } catch (err) {
      setActionError(err.message || "Could not approve this question");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReject = async (questionId) => {
    setActionError("");
    setIsBusy(true);
    try {
      await reject(questionId);
    } catch (err) {
      setActionError(err.message || "Could not reject this question");
    } finally {
      setIsBusy(false);
    }
  };

  const toggleSelection = (questionId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((q) => q.id)),
    );
  };

  const handleBulkApprove = async () => {
    setActionError("");
    setIsBusy(true);
    try {
      const updatedIds = await bulkApprove([...selectedIds]);
      const missed = selectedIds.size - updatedIds.length;
      if (missed > 0) {
        setActionError(
          `${missed} of ${selectedIds.size} selected question${missed === 1 ? "" : "s"} had already been decided elsewhere and ${missed === 1 ? "was" : "were"} skipped.`,
        );
      }
      setSelectedIds(new Set());
    } catch (err) {
      setActionError(err.message || "Could not approve the selected questions");
    } finally {
      setIsBusy(false);
    }
  };

  const handleBulkReject = async () => {
    setActionError("");
    setIsBusy(true);
    try {
      const updatedIds = await bulkReject([...selectedIds]);
      const missed = selectedIds.size - updatedIds.length;
      if (missed > 0) {
        setActionError(
          `${missed} of ${selectedIds.size} selected question${missed === 1 ? "" : "s"} had already been decided elsewhere and ${missed === 1 ? "was" : "were"} skipped.`,
        );
      }
      setSelectedIds(new Set());
    } catch (err) {
      setActionError(err.message || "Could not reject the selected questions");
    } finally {
      setIsBusy(false);
    }
  };

  const switchToFocus = () => {
    setViewMode("focus");
    resetPosition();
  };

  // A / R / E / → shortcuts - this page's whole value proposition over
  // ReviewTab.jsx is throughput, so keyboard-only operation matters here
  // in a way it doesn't on a page you occasionally click into. Ignored
  // while typing in a form field (the confidence filter input) so "r" in
  // "review" doesn't reject the current question out from under someone.
  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping || isViewer || isBusy || viewMode !== "focus" || !current)
        return;

      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        handleApprove(current.id);
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleReject(current.id);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        skip();
      } else if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        navigate(
          `/cluster/${current.clusterId}/mock/${current.mockTestId}/editor?qId=${current.id}&returnTo=/review-queue`,
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isViewer, isBusy, viewMode]);

  return (
    <div className="space-y-5 font-inter max-w-3xl mx-auto">
      <ReviewQueueIntroCard />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Review Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every question waiting on a decision, across all your clusters -
          worked one at a time so you can burn through the backlog without
          hopping between mock tests.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border bg-card p-0.5 shrink-0">
          <button
            type="button"
            onClick={switchToFocus}
            className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "focus"
                ? "bg-[#ea580c] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" /> Focus
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title="Multi-select for approving several obviously-fine questions at once"
            className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "list"
                ? "bg-[#ea580c] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={clusterId}
          onChange={(e) => setClusterId(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        >
          <option value="">All clusters</option>
          {clusters.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          max="100"
          placeholder="Confidence below..."
          value={maxConfidence}
          onChange={(e) => setMaxConfidence(e.target.value)}
          className="w-40 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        />

        <button
          type="button"
          onClick={() => setHasAiIssues((v) => !v)}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            hasAiIssues
              ? "bg-[#ea580c] text-white shadow-xs"
              : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
          }`}
        >
          Flagged by AI only
        </button>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="ml-auto rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" /> {actionError}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error.message || "Could not load the review queue"}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading queue...
        </div>
      ) : isQueueEmpty || (viewMode === "focus" && isAtEnd) ? (
        <QueueEmptyState hasFilters={hasActiveFilters} />
      ) : viewMode === "list" ? (
        <>
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
            <span>
              {items.length} loaded{total ? ` of ${total} total` : ""}
            </span>
            {filterSummary && <span className="truncate">{filterSummary}</span>}
          </div>
          <QueueListView
            items={items}
            selectedIds={selectedIds}
            onToggle={toggleSelection}
            onToggleAll={toggleSelectAll}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            isBusy={isBusy}
            isViewer={isViewer}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            onLoadMore={loadMore}
          />
        </>
      ) : (
        current && (
          <>
            <QueueProgressBar
              position={index + 1}
              total={total}
              filterSummary={filterSummary}
            />
            <QueueQuestionCard
              question={current}
              onApprove={handleApprove}
              onReject={handleReject}
              onSkip={skip}
              isBusy={isBusy}
              isViewer={isViewer}
            />
            <p className="text-center text-[11px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">
                A
              </kbd>{" "}
              approve ·{" "}
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">
                R
              </kbd>{" "}
              reject ·{" "}
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">
                E
              </kbd>{" "}
              edit ·{" "}
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">
                →
              </kbd>{" "}
              skip
            </p>
          </>
        )
      )}
    </div>
  );
}
