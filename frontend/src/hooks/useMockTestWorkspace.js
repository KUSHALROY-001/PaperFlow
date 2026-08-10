import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { mapQuestion, statusConfig } from "@/utils/mockTestHelpers";

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

  const { data: questionsData } = useQuery({
    queryKey: ["questions", mockTestId],
    queryFn: () => api.listQuestions(mockTestId),
    enabled: Boolean(mockTestId),
    refetchInterval: () => {
      const mockStatus = queryClient.getQueryData(["mock-test", mockTestId])
        ?.mockTest?.status;
      return mockStatus === "processing" ? 2500 : false;
    },
  });

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
  const jobSummary = latestJob?.output_summary || {};
  const ocrSummary = jobSummary.ocr || {};
  const aiSummary = jobSummary.ai || {};
  const questions = useMemo(
    () => (questionsData?.questions || []).map(mapQuestion),
    [questionsData],
  );
  const submissions = submissionsData?.submissions || [];

  useEffect(() => {
    if (!latestJobId || !["completed", "failed"].includes(latestJobStatus))
      return;

    queryClient.invalidateQueries({ queryKey: ["mock-test", mockTestId] });
    queryClient.invalidateQueries({ queryKey: ["questions", mockTestId] });
    queryClient.invalidateQueries({ queryKey: ["mock-tests", clusterId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }, [clusterId, latestJobId, latestJobStatus, mockTestId, queryClient]);

  useEffect(() => {
    if (
      latestJobStatus === "completed" &&
      questions.length > 0 &&
      openedOutputJobId !== latestJobId
    ) {
      setActiveTab("output");
      setOpenedOutputJobId(latestJobId);
    }
  }, [latestJobId, latestJobStatus, openedOutputJobId, questions.length]);

  const status = statusConfig[mocktest?.status] || statusConfig.draft;
  const lowConfidence = questions.filter(
    (question) => question.confidence < 75,
  ).length;
  const topicsFound = new Set(
    questions.map((question) => question.topic).filter(Boolean),
  ).size;
  const approvedCount = questions.filter(
    (question) => question.status === "approved",
  ).length;

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
  const handleUpload = async (file, documentType) => {
    try {
      setActionError("");
      await api.uploadMockTestDocument(mocktest.id, file, documentType);
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
      await queryClient.invalidateQueries({
        queryKey: ["questions", mockTestId],
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
      await queryClient.invalidateQueries({
        queryKey: ["questions", mockTestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mock-test", mockTestId],
      });
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteMockTest(mocktest.id);
      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      navigate(`/cluster/${clusterId}`);
    } catch (error) {
      setActionError(error.message || "Could not delete mock test");
    }
  };

  const handleDeleteSubmission = async (attemptId) => {
    try {
      await api.deleteAttempt(attemptId);
      await queryClient.invalidateQueries({
        queryKey: ["submissions", mockTestId],
      });
    } catch (error) {
      // Re-thrown (not just captured into actionError) so
      // SubmissionCard's own try/catch around this call can react locally
      // - keep its confirm dialog open and show its own inline error,
      // instead of the dialog silently closing as if the delete had
      // succeeded while the real error only surfaces in the page-level
      // banner above the tabs.
      setActionError(error.message || "Could not delete this submission");
      throw error;
    }
  };

  return {
    clusterId,
    cluster,
    clusterMockTests,
    mocktest,
    isLoading,
    latestJob,
    questions,
    submissions,
    isLoadingSubmissions,
    ocrSummary,
    aiSummary,
    activeTab,
    setActiveTab,
    actionError,
    status,
    stats: { lowConfidence, topicsFound, approvedCount },
    metadata,
    handleUpload,
    handleReprocess,
    handlePublish,
    handleQuestionStatusChange,
    handleQuestionDelete,
    handleDelete,
    handleDeleteSubmission,
  };
}
