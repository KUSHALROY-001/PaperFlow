import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  X,
  Clock,
  FileText,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Award,
  Building2,
  ExternalLink,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSubscriptions } from "@/lib/useSubscriptions";

export default function MockTestDetailModal({
  mockTestId,
  slug,
  isPublic = true,
  onClose,
}) {
  const navigate = useNavigate();
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const { isSubscribed, toggleSubscription, isSubscribing } = useSubscriptions();

  const { data, isLoading, error } = useQuery({
    queryKey: ["mock-test-detail", mockTestId, slug, isPublic],
    queryFn: () =>
      isPublic
        ? api.getPublicCatalogMockTest(mockTestId, slug)
        : api.getMockTestSummary(mockTestId),
  });
  const mockTest = data?.mockTest;
  const topics = mockTest?.topics || [];

  const topicCounts = useMemo(
    () => new Map(topics.map((t) => [t.topic, t.count])),
    [topics],
  );
  const topicNames = useMemo(() => topics.map((t) => t.topic).sort(), [topics]);

  const toggleTopic = (topic) => {
    setSelectedTopics((current) => {
      const next = new Set(current);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const selectedTopicsCount = selectedTopics.size;
  const selectedQuestionsCount = [...selectedTopics].reduce(
    (sum, topic) => sum + (topicCounts.get(topic) || 0),
    0,
  );

  const startAttempt = async (topicsToStart) => {
    const targetSlug = slug || mockTest?.workspace_slug;
    const query = topicsToStart?.length
      ? `?${topicsToStart.map((t) => `topics=${encodeURIComponent(t)}`).join("&")}`
      : "";

    if (isPublic && targetSlug) {
      try {
        const { share } = await api.startCatalogAttempt(targetSlug, mockTestId);
        navigate(`/shared/${share.shareToken}${query}`);
      } catch (err) {
        console.error("Failed to start catalog attempt:", err);
      }
    } else {
      navigate(`/session/${mockTestId}${query}`);
    }
  };

  const publisherSlug = slug || mockTest?.workspace_slug;
  const publisherName = mockTest?.workspace_name;
  const subscribed = isSubscribed(publisherSlug);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto surface-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl">
        <div className="sticky top-0 surface-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-foreground">Test details</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : error || !mockTest ? (
          <div className="px-5 py-10 text-center text-sm text-red-500">
            {error?.message || "This test isn't available anymore."}
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-foreground leading-snug">
                {mockTest.name}
              </h3>
              {mockTest.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {mockTest.description}
                </p>
              )}
            </div>

            {/* Publisher Card & Subscription */}
            {(publisherName || publisherSlug) && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 font-extrabold text-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Publisher
                    </span>
                    <p className="text-sm font-bold text-foreground truncate">
                      {publisherName || "PaperFlow Publisher"}
                    </p>
                    {publisherSlug && (
                      <a
                        href={`/catalog/${publisherSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orange-500 hover:underline font-semibold inline-flex items-center gap-1 mt-0.5"
                      >
                        @{publisherSlug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {publisherSlug && (
                  <button
                    type="button"
                    disabled={isSubscribing}
                    onClick={() => toggleSubscription(publisherSlug)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      subscribed
                        ? "bg-orange-500/15 text-orange-500 border border-orange-500/30 hover:bg-red-500/15 hover:text-red-500 hover:border-red-500/30"
                        : "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20"
                    }`}
                  >
                    {subscribed ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Subscribed
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Subscribe
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" /> Questions
                </p>
                <p className="text-lg font-extrabold text-foreground mt-0.5">
                  {mockTest.total_questions}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Duration
                </p>
                <p className="text-lg font-extrabold text-foreground mt-0.5">
                  {mockTest.duration_minutes} min
                </p>
              </div>
              {mockTest.marks_per_correct != null && (
                <div className="col-span-2 rounded-xl border border-border bg-card px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5" /> Marking scheme
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    +{mockTest.marks_per_correct} for correct
                    {Number(mockTest.negative_marks_per_wrong) > 0
                      ? `, -${mockTest.negative_marks_per_wrong} for wrong`
                      : ""}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => startAttempt(null)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 text-orange-500 px-4 py-3 text-sm font-bold transition-colors hover:bg-[#ea580c] hover:text-white hover:border-[#ea580c]"
            >
              <Play className="w-4 h-4" />
              Start Full Test
            </button>

            {topicNames.length > 0 && (
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2 text-sm">
                    <Filter className="w-4 h-4 text-orange-500" /> Topic-wise
                    Practice
                  </h4>
                  {topicNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTopics((current) =>
                          current.size === topicNames.length
                            ? new Set()
                            : new Set(topicNames),
                        )
                      }
                      className="text-xs font-semibold text-orange-500 hover:underline shrink-0"
                    >
                      {selectedTopicsCount === topicNames.length
                        ? "Clear all"
                        : "Select all"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Select one or more topics, then start a practice session
                  covering just those questions.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {topicNames.map((topic, index) => {
                    const isHiddenOnMobile = !showAllTopics && index >= 4;
                    const count = topicCounts.get(topic) || 0;
                    const isSelected = selectedTopics.has(topic);
                    return (
                      <button
                        type="button"
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        aria-pressed={isSelected}
                        className={`items-center justify-between gap-2 px-3.5 py-2.5 border font-medium rounded-xl transition-colors text-xs sm:text-sm ${
                          isHiddenOnMobile ? "hidden sm:flex" : "flex"
                        } ${
                          isSelected
                            ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            : "border-border bg-card text-foreground hover:border-orange-500/40 hover:bg-muted"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              isSelected
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </span>
                          <span className="truncate">{topic}</span>
                        </span>
                        <span
                          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSelected
                              ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                              : "bg-orange-500/10 text-orange-500"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {topicNames.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTopics((prev) => !prev)}
                    className="mt-3 sm:hidden flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-semibold text-orange-500 hover:bg-orange-500/20 transition-all"
                  >
                    {showAllTopics ? (
                      <>
                        See Less <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        See More ({topicNames.length - 4} more){" "}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startAttempt([...selectedTopics])}
                  disabled={selectedTopicsCount === 0}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-orange-500"
                >
                  <Play className="w-4 h-4" />
                  {selectedTopicsCount === 0
                    ? "Select topics to start"
                    : `Start Practice — ${selectedTopicsCount} topic${selectedTopicsCount > 1 ? "s" : ""}, ${selectedQuestionsCount} question${selectedQuestionsCount > 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
