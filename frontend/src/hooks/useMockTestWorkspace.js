import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useStreamingQuestions } from "./useStreamingQuestions";
import { formatDate } from "@/lib/date";
import {
  decorateQuestionsForWorkspace,
  mapQuestion,
  statusConfig,
} from "@/utils/mockTestHelpers";

// Extracted from pages/MockTestWorkspace.jsx — no behavior changes.
// Owns all data fetching, derived state, and mutation handlers for the
// mock-test workspace page.
export function useMockTestWorkspace() {
  const { clusterId, mockTestId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );
  const [actionError, setActionError] = useState("");
  const [openedOutputJobId, setOpenedOutputJobId] = useState(null);

  const { data: clusterData } = useQuery({
    queryKey: ["cluster", clusterId],
    queryFn: () => api.getCluster(clusterId),
    enabled: Boolean(clusterId),
  });

  const { data: mockTestsData } = useQuery({
    queryKey: ["mock-tests", clusterId],
    queryFn: () => api.listMockTests(clusterId),
    enabled: Boolean(clusterId),
  });

  const { data: mocktestData, isLoading } = useQuery({
    queryKey: ["mock-test", mockTestId],
    queryFn: () => api.getMockTest(mockTestId),
    enabled: Boolean(mockTestId),
  });

  // Four integers, computed in SQL. This is what the stat tiles and the
  // during-processing poll read now - previously both were served by the
  // full question list below, which meant a 100-page paper's entire
  // extraction crossed the wire every 2.5 seconds while a job ran, just
  // to update four numbers.
  const { data: questionStatsData } = useQuery({
    queryKey: ["question-stats", mockTestId],
    queryFn: () => api.getQuestionStats(mockTestId),
    enabled: Boolean(mockTestId),
    refetchInterval: () => {
      const mockStatus = queryClient.getQueryData(["mock-test", mockTestId])
        ?.mockTest?.status;
      // Also keyed off the job cache, not just the mock test's own status.
      // The ["mock-test"] query isn't polled, so its cached status can lag
      // behind reality by a whole job; the jobs query IS polled every 2s
      // while one is in flight. This poll is what drives the live Review/
      // Output fill-in, so it must not stall on a stale status field.
      const latestJobStatusInCache = queryClient.getQueryData([
        "processing-jobs",
        "mock-test",
        mockTestId,
      ])?.jobs?.[0]?.status;
      const isJobInFlight =
        mockStatus === "processing" ||
        ["queued", "running"].includes(latestJobStatusInCache);
      return isJobInFlight ? 2500 : false;
    },
  });
  const questionStats = questionStatsData?.stats || null;

  // Streamed in pages rather than fetched as one array, and gated to the
  // tabs that actually render questions (overview's preview, review,
  // output) - same gating idea as submissionsData below.
  //
  // The paging is what makes Review and Output live: the worker commits
  // extracted questions in batches of 30, the stats poll above sees the
  // count climb every 2.5s while a job runs, and useStreamingQuestions
  // fetches and appends exactly the rows that appeared. So the tabs fill
  // in as the extraction happens instead of sitting empty until the job
  // reports "completed" and then rendering 3000 questions at once.
  const needsQuestionList = ["overview", "review", "output"].includes(
    activeTab,
  );

  const { data: jobsData } = useQuery({
    queryKey: ["processing-jobs", "mock-test", mockTestId],
    queryFn: () => api.listProcessingJobs({ mockTestId }),
    enabled: Boolean(mockTestId),
    refetchInterval: (query) => {
      const latest = query.state.data?.jobs?.[0];
      return latest && ["queued", "running"].includes(latest.status)
        ? 2000
        : false;
    },
  });

  // Gated on the Submissions tab being active (unlike questionsData/
  // jobsData above, which the top-level stat cards need regardless of
  // tab) - no reason to fetch every taker's name/score on every page
  // load when most visits never open this tab.
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ["submissions", mockTestId],
    queryFn: () => api.listSubmissions(mockTestId),
    enabled: Boolean(mockTestId) && activeTab === "submissions",
  });

  const cluster = clusterData?.cluster;
  const clusterMockTests = mockTestsData?.mockTests || [];
  const mocktest = mocktestData?.mockTest;
  const latestJob = jobsData?.jobs?.[0];
  const latestJobId = latestJob?.id;
  const latestJobStatus = latestJob?.status;

  // Restarts the stream from offset 0 whenever a job reaches a terminal
  // state. Necessary because the worker's post-save passes (duplicate
  // detection, and the bounded near-duplicate regeneration that rewrites
  // slot content in place) can change rows that were already streamed in
  // while the job was running.
  const questionStreamToken = `${latestJobId || ""}:${latestJobStatus || ""}`;
  const {
    questions: streamedQuestions,
    isStreaming: isStreamingQuestions,
    loadedCount: loadedQuestionCount,
    hasMoreQuestions,
    loadMoreQuestions,
    loadThroughQuestion,
    patchQuestion,
    removeQuestion,
  } = useStreamingQuestions(mockTestId, {
    enabled: Boolean(mockTestId) && needsQuestionList,
    // Review and Output are deliberately user-paced. Overview retains its
    // live, automatic loading behavior.
    autoLoad: activeTab === "overview",
    total:
      (questionStats?.total ?? 0) +
      (activeTab === "review" ? questionStats?.staleReprocess ?? 0 : 0),
    resetToken: questionStreamToken,
    includeStale: activeTab === "review",
  });
  const jobSummary = latestJob?.output_summary || {};
  const ocrSummary = jobSummary.ocr || {};
  const aiSummary = jobSummary.ai || {};
  const isGenerated =
    latestJob?.input_config?.documentType === "generate_from_existing";

  // Only fetched for a test that was actually generated - most mock
  // tests were uploaded/created normally and this would just come back
  // empty, so there's no reason to fire it on every workspace page load.
  const { data: generationSourcesData } = useQuery({
    queryKey: ["generation-sources", mockTestId],
    queryFn: () => api.getGenerationSources(mockTestId),
    enabled: Boolean(mockTestId) && isGenerated,
  });
  const generationSources = generationSourcesData?.sources || [];
  const questions = useMemo(
    () =>
      decorateQuestionsForWorkspace(
        streamedQuestions.map(mapQuestion),
        mocktest,
      ),
    [streamedQuestions, mocktest],
  );
  const submissions = submissionsData?.submissions || [];

  useEffect(() => {
    if (!latestJobId || !["completed", "failed"].includes(latestJobStatus))
      return;

    queryClient.invalidateQueries({ queryKey: ["mock-test", mockTestId] });
    queryClient.invalidateQueries({ queryKey: ["questions", mockTestId] });
    queryClient.invalidateQueries({ queryKey: ["question-stats", mockTestId] });
    queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }, [clusterId, latestJobId, latestJobStatus, mockTestId, queryClient]);

  // Keyed off the stats count rather than questions.length: the full list
  // is no longer fetched on the Processing tab, which is where the user is
  // sitting when a job completes, so questions.length would be 0 there and
  // this auto-switch would never fire.
  useEffect(() => {
    if (
      latestJobStatus === "completed" &&
      (questionStats?.total ?? 0) > 0 &&
      openedOutputJobId !== latestJobId
    ) {
      setActiveTab("output");
      setOpenedOutputJobId(latestJobId);
    }
  }, [latestJobId, latestJobStatus, openedOutputJobId, questionStats?.total]);

  const status = statusConfig[mocktest?.status] || statusConfig.draft;
  // Single source of truth for "is a job currently in flight for this
  // mock test" - MockTestWorkspace.jsx's top-bar button and
  // OverviewTab.jsx's quick-action button both key off this to swap
  // between Reprocess and Cancel, so they can't disagree with each other.
  const isProcessing =
    mocktest?.status === "processing" ||
    ["queued", "running"].includes(latestJobStatus);
  // All four now come from the server aggregate (see questionStats above)
  // rather than from .filter() over a list this hook may not even have
  // fetched. The || 0 fallbacks cover the first render before the stats
  // request resolves.
  const questionCount = questionStats?.total ?? 0;
  const lowConfidence = questionStats?.lowConfidence ?? 0;
  const topicsFound = questionStats?.topicsFound ?? 0;
  const approvedCount = questionStats?.approved ?? 0;

  const metadata = mocktest
    ? {
        clusterId,
        clusterName: cluster?.name || "Cluster",
        mockTestId: mocktest.id,
        mockTestName: mocktest.name,
        sourceFile: "Manual entry",
        generatedAt: formatDate(mocktest.updated_at || mocktest.created_at),
        processingStatus: latestJob?.status || mocktest.status,
        processingStage: latestJob?.current_stage || "Not started",
        processingProgress: latestJob?.progress_percent ?? 0,
      }
    : null;

  // Only ever reachable pre-upload (see the guard OverviewTab uses to show
  // its upload panel: no job has ever been queued yet). Reprocessing an
  // existing file is a separate action (handleReprocess) that requires no
  // file input at all - this is specifically for a template-created mock
  // test that has never had a PDF attached.
  const handleUpload = async (file, documentType, desiredQuestionCount) => {
    try {
      setActionError("");
      await api.uploadMockTestDocument(
        mocktest.id,
        file,
        documentType,
        desiredQuestionCount,
      );
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["processing-jobs", "mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setActiveTab("processing");
    } catch (error) {
      setActionError(error.message || "Could not upload document");
    }
  };

  const handleReprocess = async () => {
    try {
      await api.reprocessMockTest(mocktest.id);
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["processing-jobs", "mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      setActiveTab("processing");
      setActionError("");
    } catch (error) {
      setActionError(error.message || "Could not reprocess mock test");
    }
  };

  // Sibling to handleReprocess above, not a replacement for it - the
  // Reprocess button in MockTestWorkspace.jsx/OverviewTab.jsx turns into
  // this Cancel action while a job is queued/running, specifically so
  // starting a second extraction requires cancelling the first one first
  // instead of one implicitly superseding the other.
  const handleCancelProcessing = async () => {
    try {
      await api.cancelProcessing(mocktest.id);
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["processing-jobs", "mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      setActionError("");
    } catch (error) {
      setActionError(error.message || "Could not cancel processing");
    }
  };

  // The backend has no guard against publishing an empty or
  // still-processing mock test (publishMockTest just unconditionally sets
  // status='published') - MockTestWorkspace.jsx disables the button
  // client-side (no questions yet, or still processing) as the actual
  // safety net here, same spirit as the existing Reprocess/Delete guards.
  const handlePublish = async () => {
    try {
      await api.publishMockTest(mocktest.id);
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      setActionError("");
    } catch (error) {
      setActionError(error.message || "Could not publish mock test");
    }
  };

  const handleQuestionStatusChange = async (questionId, statusValue) => {
    try {
      setActionError("");
      await api.updateQuestion(questionId, { status: statusValue });
      // Patched in place rather than by invalidating and re-reading:
      // re-reading would mean draining the whole stream again just to
      // change one row's status.
      patchQuestion(questionId, { status: statusValue });
      // Approving a question moves the "approved" tile, which is now a
      // server aggregate rather than something derived from the list.
      await queryClient.invalidateQueries({
        queryKey: ["question-stats", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleQuestionDelete = async (questionId) => {
    try {
      setActionError("");
      await api.deleteQuestion(questionId);
      removeQuestion(questionId);
      await queryClient.invalidateQueries({
        queryKey: ["question-stats", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleRestoreStaleQuestion = async (questionId) => {
    try {
      setActionError("");
      // mapQuestion derives the Review UI's stale state from the nested
      // `review_flags` object. Merge the server's updated raw row into the
      // stream immediately; patching a derived `staleFromReprocess` field
      // here would be ignored by that mapper and made the editor refresh.
      const restored = await api.restoreStaleQuestion(questionId);
      patchQuestion(questionId, restored.question);

      // Keep visible totals responsive as well. The invalidations below
      // still reconcile with the database, but they must not be the first
      // time the user sees the question become part of the live paper.
      queryClient.setQueryData(["question-stats", mockTestId], (current) => {
        if (!current?.stats) return current;
        const stats = current.stats;
        return {
          ...current,
          stats: {
            ...stats,
            total: Number(stats.total || 0) + 1,
            staleReprocess: Math.max(0, Number(stats.staleReprocess || 0) - 1),
          },
        };
      });
      queryClient.setQueryData(["mock-test", mockTestId], (current) => {
        if (!current?.mockTest) return current;
        return {
          ...current,
          mockTest: {
            ...current.mockTest,
            total_questions: Number(current.mockTest.total_questions || 0) + 1,
          },
        };
      });
      queryClient.setQueryData(["mock-tests", clusterId], (current) => {
        if (!Array.isArray(current?.mockTests)) return current;
        return {
          ...current,
          mockTests: current.mockTests.map((test) =>
            test.id === mockTestId
              ? { ...test, total_questions: Number(test.total_questions || 0) + 1 }
              : test,
          ),
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["questions", mockTestId] }),
        queryClient.invalidateQueries({ queryKey: ["question-stats", mockTestId] }),
        queryClient.invalidateQueries({ queryKey: ["mock-test", mockTestId] }),
        queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] }),
      ]);
    } catch (error) {
      setActionError(error.message || "Could not add the question back to this mock test");
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteMockTest(mocktest.id);
      // Optimistically remove from mock-tests cache so it vanishes instantly upon returning
      queryClient.setQueryData(["mock-tests", clusterId], (old) => {
        if (!old?.mockTests) return old;
        return {
          ...old,
          mockTests: old.mockTests.filter((m) => m.id !== mocktest.id),
        };
      });
      queryClient.removeQueries({ queryKey: ["mock-test", mockTestId] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] }),
        queryClient.invalidateQueries({ queryKey: ["cluster", clusterId] }),
        queryClient.invalidateQueries({ queryKey: ["clusters"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      navigate(`/cluster/${clusterId}`);
    } catch (error) {
      setActionError(error.message || "Could not delete mock test");
    }
  };

  return {
    clusterId,
    cluster,
    clusterMockTests,
    mocktest,
    isLoading,
    latestJob,
    isGenerated,
    generationSources,
    questions,
    // The paper's real length, independent of how much of the stream has
    // arrived. Anything that only needs a count should use this, not
    // questions.length.
    questionCount,
    // "Rows are still coming in" - true both for the initial drain of a
    // large paper and for a job actively committing new batches.
    isStreamingQuestions,
    loadedQuestionCount,
    hasMoreQuestions,
    loadMoreQuestions,
    loadThroughQuestion,
    submissions,
    isLoadingSubmissions,
    ocrSummary,
    aiSummary,
    activeTab,
    setActiveTab,
    actionError,
    status,
    isProcessing,
    stats: { lowConfidence, topicsFound, approvedCount },
    metadata,
    handleUpload,
    handleReprocess,
    handleCancelProcessing,
    handlePublish,
    handleQuestionStatusChange,
    handleQuestionDelete,
    handleRestoreStaleQuestion,
    handleDelete,
  };
}
