import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Clock, FileText, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useSubscriptions } from "@/lib/useSubscriptions";
import MockTestDetailModal from "../catalog/MockTestDetailModal";
import { SkeletonCard } from "@/components/ui/skeleton-card";

// Shared by PublicCatalog.jsx (institute mode AND global mode) and
// PublicMockTests.jsx's "Public Mock Tests" tab - the exact same
// search/filter/grid/start-test UI and data-fetching used to be
// duplicated three times across those two files, with only the data
// source (one institute's slug vs the global cross-institute feed)
// actually differing between them.
export default function CatalogBrowser({
  slug,
  showSubscriberFilter = true,
  onWorkspaceName,
  onError,
}) {
  const navigate = useNavigate();
  const isInstituteMode = Boolean(slug);

  const [search, setSearch] = useState("");
  const [examYear, setExamYear] = useState("");
  const [selectedSubscriber, setSelectedSubscriber] = useState("");
  const [startingId, setStartingId] = useState(null);
  const [startError, setStartError] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const { subscriptions, isSubscribed } = useSubscriptions();

  const listingQuery = useQuery({
    queryKey: isInstituteMode
      ? ["public-catalog", slug, search, examYear]
      : ["public-catalog-global", search, examYear],
    queryFn: () =>
      isInstituteMode
        ? api.getPublicCatalog(slug, { search, examYear })
        : api.getGlobalPublicCatalog({ search, examYear }),
  });
  const examYearsQuery = useQuery({
    queryKey: isInstituteMode
      ? ["public-catalog-exam-years", slug]
      : ["public-catalog-global-exam-years"],
    queryFn: () =>
      isInstituteMode
        ? api.getPublicCatalogExamYears(slug)
        : api.getGlobalPublicCatalogExamYears(),
  });

  const workspaceName = listingQuery.data?.workspaceName;
  useEffect(() => {
    if (isInstituteMode && workspaceName) onWorkspaceName?.(workspaceName);
  }, [isInstituteMode, workspaceName, onWorkspaceName]);
  useEffect(() => {
    if (isInstituteMode && listingQuery.error) onError?.(listingQuery.error);
  }, [isInstituteMode, listingQuery.error, onError]);

  const rawMockTests = listingQuery.data?.mockTests || [];
  const examYears = examYearsQuery.data?.examYears || [];

  const mockTests = rawMockTests.filter((mt) => {
    if (!selectedSubscriber) return true;
    const targetSlug = isInstituteMode ? slug : mt.workspace_slug;
    if (selectedSubscriber === "__all_subscribed__") {
      return isSubscribed(targetSlug);
    }
    return targetSlug?.toLowerCase() === selectedSubscriber.toLowerCase();
  });

  const handleStart = async (mockTest) => {
    const targetSlug = isInstituteMode ? slug : mockTest.workspace_slug;
    setStartError(null);
    setStartingId(mockTest.id);
    try {
      const { share } = await api.startCatalogAttempt(targetSlug, mockTest.id);
      navigate(`/shared/${share.shareToken}`);
    } catch (err) {
      setStartError(err.message || "Couldn't start this test - try again");
      setStartingId(null);
    }
  };

  if (isInstituteMode && listingQuery.error) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-md md:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isInstituteMode
                ? "Search mock tests..."
                : "Search mock tests or institutes..."
            }
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-3xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {examYears.length > 0 && (
          <select
            value={examYear}
            onChange={(e) => setExamYear(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-foreground"
          >
            <option value="">All years</option>
            {examYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
        {!isInstituteMode && showSubscriberFilter && (
          <select
            value={selectedSubscriber}
            onChange={(e) => setSelectedSubscriber(e.target.value)}
            disabled={subscriptions.length === 0}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-md border bg-card focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedSubscriber
                ? "border-orange-500 text-orange-500 font-bold"
                : "border-border text-foreground"
            }`}
          >
            <option value="">
              {subscriptions.length === 0
                ? "No Subscriptions"
                : "Subscribed Publishers"}
            </option>
            {subscriptions.length > 0 && (
              <option value="__all_subscribed__">
                All Subscribed ({subscriptions.length})
              </option>
            )}
            {subscriptions.map((sub) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.workspaceName || sub.slug} (@{sub.slug})
              </option>
            ))}
          </select>
        )}
      </div>

      {startError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {startError}
        </div>
      )}

      {listingQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} showIcon={false} lines={2} />
          ))}
        </div>
      ) : mockTests.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {selectedSubscriber
              ? "No mock tests found for the selected subscription filter."
              : search || examYear
                ? "No mock tests match your search."
                : isInstituteMode
                  ? "No mock tests are available here yet."
                  : "No institute has listed a public mock test yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockTests.map((mockTest) => (
            <div
              key={mockTest.id}
              onClick={() =>
                setDetailTarget({
                  id: mockTest.id,
                  slug: isInstituteMode ? slug : mockTest.workspace_slug,
                })
              }
              role="button"
              tabIndex={0}
              className="surface-card rounded-2xl p-4 border border-border flex flex-col cursor-pointer transition-colors hover:border-orange-500/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground leading-snug">
                  {mockTest.name}
                </h3>
                {mockTest.exam_year && (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                    {mockTest.exam_year}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {!isInstituteMode && mockTest.workspace_name
                  ? `${mockTest.workspace_name} · ${mockTest.cluster_name}`
                  : mockTest.cluster_name}
              </p>
              {mockTest.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {mockTest.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {mockTest.total_questions} questions
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {mockTest.duration_minutes} min
                </span>
              </div>
              <button
                type="button"
                disabled={startingId === mockTest.id}
                onClick={(event) => {
                  event.stopPropagation();
                  handleStart(mockTest);
                }}
                className="mt-4 w-full py-2 border border-orange-500/40 text-orange-500 hover:bg-[#ea580c] hover:border-[#ea580c] hover:text-white disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-orange-500 text-xs font-semibold rounded-xl transition-colors"
              >
                {startingId === mockTest.id ? "Starting…" : "Start Test"}
              </button>
            </div>
          ))}
        </div>
      )}

      {detailTarget && (
        <MockTestDetailModal
          mockTestId={detailTarget.id}
          slug={detailTarget.slug}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
