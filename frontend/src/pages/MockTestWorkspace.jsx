import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Filter,
  Play,
  RotateCcw,
  Trash2,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import ProcessingTab from "../components/cluster/ProcessingTab";
import ReviewTab from "../components/cluster/ReviewTab";
import OutputTab from "../components/cluster/OutputTab";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "processing", label: "Processing" },
  { id: "review", label: "Review" },
  { id: "output", label: "Output" },
];

const statusConfig = {
  published: {
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Ready",
  },
  review: {
    color:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    dot: "bg-amber-500",
    label: "Needs Review",
  },
  processing: {
    color:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    dot: "bg-orange-500 animate-pulse",
    label: "Processing",
  },
  draft: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Draft",
  },
  archived: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Archived",
  },
};

function formatDate(dateStr) {
  if (!dateStr) return "-";

  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mapQuestion(question) {
  const options = question.options?.map((option) => option.optionText) || [];
  const correctIndex = question.correct_option_indexes?.[0] ?? 0;
  const metadata = question.metadata || {};
  const aiIssues = Array.isArray(metadata.aiIssues) ? metadata.aiIssues : [];
  const normalizedStatus = ["approved", "rejected"].includes(question.status)
    ? question.status
    : "review";

  return {
    id: question.id,
    questionNo: question.question_no,
    topic: question.topic || "Untitled",
    confidence: question.confidence || 100,
    status: normalizedStatus,
    text: question.question_text,
    sourceLine: question.source_page
      ? `Page ${question.source_page}`
      : "Manual entry",
    options,
    answer: options[correctIndex] || "",
    correctOptionIndexes: question.correct_option_indexes || [correctIndex],
    aiIssues,
    aiNeedsReview: metadata.aiNeedsReview,
  };
}

function normalizeJobStage(stage = "") {
  return stage.toLowerCase();
}

function buildProcessingPhases(mocktest, latestJob) {
  const isProcessing = mocktest?.status === "processing";
  const hasQuestions = Number(mocktest?.total_questions || 0) > 0;
  const stage = normalizeJobStage(latestJob?.current_stage);
  const progress = Number(latestJob?.progress_percent || 0);
  const isFailed = latestJob?.status === "failed";

  const statusFor = (threshold, stageMatchers = []) => {
    if (isFailed) return "pending";
    if (
      hasQuestions ||
      latestJob?.status === "completed" ||
      progress >= threshold
    )
      return "complete";
    if (
      isProcessing &&
      stageMatchers.some((matcher) => stage.includes(matcher))
    )
      return "active";
    return "pending";
  };

  return [
    {
      title: "Phase 1: Upload & AI Extraction",
      icon: FileText,
      steps: [
        {
          label: "PDF uploaded",
          status: latestJob || hasQuestions ? "complete" : "pending",
        },
        {
          label: "OCR searchable PDF",
          status: statusFor(45, ["ocr", "converting scanned"]),
        },
        {
          label: "PDF text extracted",
          status: statusFor(55, ["extracting", "parsing"]),
        },
        { label: "AI cleanup", status: statusFor(75, ["ai cleanup"]) },
      ],
    },
    {
      title: "Phase 2: Review & Export",
      icon: Zap,
      steps: [
        { label: "Question detection", status: statusFor(80, ["parsing"]) },
        { label: "Option parsing", status: statusFor(80, ["parsing"]) },
        {
          label: "Answer extraction",
          status: statusFor(80, ["ai cleanup", "saving"]),
        },
        {
          label: "Ready for JSON export",
          status: hasQuestions
            ? "complete"
            : isProcessing
              ? "active"
              : "pending",
        },
      ],
    },
  ];
}

export default function MockTestWorkspace() {
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

  const cluster = clusterData?.cluster;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!mocktest) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          Mock test not found
        </h2>
      </div>
    );
  }

  const status = statusConfig[mocktest.status] || statusConfig.draft;
  const lowConfidence = questions.filter(
    (question) => question.confidence < 75,
  ).length;
  const topicsFound = new Set(
    questions.map((question) => question.topic).filter(Boolean),
  ).size;
  const approvedCount = questions.filter(
    (question) => question.status === "approved",
  ).length;

  const metadata = {
    clusterId,
    clusterName: cluster?.name || "Cluster",
    mockTestId: mocktest.id,
    mockTestName: mocktest.name,
    sourceFile: "Manual entry",
    generatedAt: formatDate(mocktest.updated_at || mocktest.created_at),
    processingStatus: latestJob?.status || mocktest.status,
    processingStage: latestJob?.current_stage || "Not started",
    processingProgress: latestJob?.progress_percent ?? 0,
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

  const handleQuestionStatusChange = async (questionId, status) => {
    try {
      setActionError("");
      await api.updateQuestion(questionId, { status });
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
    if (!confirm("Delete this mock test and all its questions?")) return;

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link
        to={`/cluster/${clusterId}`}
        className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-orange-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {cluster?.name || "Cluster"}
      </Link>

      <div className="surface-card rounded-2xl p-4 sm:p-6 border border-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                {mocktest.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}
              >
                <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Manual mock test
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Created{" "}
                {formatDate(mocktest.created_at)}
              </span>
            </div>
            {mocktest.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {mocktest.description}
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <Link
              to={`/session/${mocktest.id}`}
              className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl hover:bg-emerald-500/20 transition-all text-xs sm:text-sm sm:flex-none"
            >
              <Play className="w-4 h-4 text-emerald-500" /> Start Test
            </Link>
            <button
              onClick={handleReprocess}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-orange-500/40 transition-all"
              title="Reprocess"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-xl border border-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {actionError}
          </div>
        )}

        {/* Dim Card Backgrounds matching icon tones for BOTH Light and Dark themes */}
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Questions Detected",
              value: mocktest.total_questions || questions.length,
              icon: Zap,
              cardBg:
                "bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20",
              iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
              valColor: "text-foreground",
            },
            {
              label: "Approved",
              value: approvedCount,
              icon: CheckCircle,
              cardBg:
                "bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20",
              iconBg:
                "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
              valColor: "text-foreground",
            },
            {
              label: "Low Confidence",
              value: lowConfidence,
              icon: AlertCircle,
              cardBg:
                "bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20",
              iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
              valColor: "text-foreground",
            },
            {
              label: "Topics Found",
              value: topicsFound,
              icon: FileText,
              cardBg:
                "bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20",
              iconBg: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
              valColor: "text-foreground",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl p-4 flex items-center gap-3.5 transition-all ${stat.cardBg}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.iconBg} shrink-0`}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`text-xl font-extrabold tracking-tight ${stat.valColor}`}
                >
                  {stat.value}
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs with exact active orange slider background like sidebar */}
      <div className="grid grid-cols-2 gap-1 surface-card border border-border rounded-2xl p-1.5 sm:flex">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-0 flex-1 py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                active
                  ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 dark:text-orange-500 font-bold border border-orange-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          mocktest={mocktest}
          questions={questions}
          latestJob={latestJob}
          clusterId={clusterId}
          setActiveTab={setActiveTab}
          onReprocess={handleReprocess}
        />
      )}
      {activeTab === "processing" && (
        <ProcessingTab
          phases={buildProcessingPhases(mocktest, latestJob)}
          job={latestJob}
          documentPreview={[
            latestJob?.current_stage || "Waiting for a PDF upload.",
            ocrSummary.error
              ? `OCR: ${ocrSummary.error}`
              : ocrSummary.converted
                ? `OCR converted ${ocrSummary.pagesOcrd || 0} page(s) into a searchable PDF.`
                : "OCR summary will appear here when scanned pages are detected.",
            aiSummary.enabled
              ? `AI: ${aiSummary.questionsFromAi || 0} question(s) returned by ${aiSummary.provider}.`
              : "AI processing summary will appear here.",
            `${questions.length} question(s) currently saved.`,
          ]}
        />
      )}
      {activeTab === "review" && (
        <ReviewTab
          questions={questions}
          onStatusChange={handleQuestionStatusChange}
          onDelete={handleQuestionDelete}
        />
      )}
      {activeTab === "output" && (
        <OutputTab questions={questions} metadata={metadata} />
      )}
    </div>
  );
}

function PhaseWaterCard({
  phaseTitle,
  status,
  substep,
  icon: Icon,
  fillLevel,
  fillTone,
}) {
  const waveColor =
    fillTone === "emerald" ? "text-emerald-500/40" : "text-orange-500/40";
  const gradientClass =
    fillTone === "emerald"
      ? "from-emerald-500/20 via-emerald-500/10 to-transparent border-t border-emerald-500/30"
      : fillTone === "orange"
        ? "from-orange-500/20 via-orange-500/10 to-transparent border-t border-orange-500/30"
        : "from-muted/40 to-muted/10";

  const iconBg =
    fillTone === "emerald"
      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      : fillTone === "orange"
        ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
        : "bg-muted text-muted-foreground";

  const statusColor =
    fillTone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : fillTone === "orange"
        ? "text-orange-600 dark:text-orange-400"
        : "text-muted-foreground";

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border surface-card p-3 transition-all sm:p-4">
      {/* Animated Liquid Water Fill Layer */}
      {fillLevel > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradientClass} transition-all duration-1000 ease-out pointer-events-none`}
          style={{ height: `${Math.min(fillLevel, 100)}%` }}
        >
          {/* Animated Liquid Wave Crest */}
          {fillLevel < 100 && (
            <div className="absolute -top-3 left-0 w-[200%] h-4 overflow-hidden opacity-80">
              <svg
                className="w-full h-full animate-liquid-wave"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,0 C150,90 350,-40 500,40 C650,120 900,-20 1200,40 L1200,120 L0,120 Z"
                  fill="currentColor"
                  className={waveColor}
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} shrink-0 shadow-xs`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground text-sm truncate">
            {phaseTitle}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {substep}
          </div>
        </div>
        <span className={`text-xs font-bold ${statusColor} shrink-0`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function OverviewTab({
  mocktest,
  questions,
  latestJob,
  clusterId,
  setActiveTab,
  onReprocess,
}) {
  const isProcessing =
    mocktest.status === "processing" ||
    ["queued", "running"].includes(latestJob?.status);
  const isReady =
    questions.length > 0 ||
    mocktest.status === "published" ||
    mocktest.status === "review";
  const topics = [
    ...new Set(questions.map((question) => question.topic).filter(Boolean)),
  ].sort();
  const currentStage =
    latestJob?.current_stage ||
    (isReady ? "Questions available" : "Waiting for PDF upload");
  const progress = Number(latestJob?.progress_percent || 0);

  const phase1FillLevel = isReady
    ? 100
    : isProcessing
      ? Math.max(progress || 68, 20)
      : 0;
  const phase1Tone = isReady ? "emerald" : isProcessing ? "orange" : "neutral";

  const phase2FillLevel = isReady ? 100 : 0;
  const phase2Tone = isReady ? "emerald" : "neutral";

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="surface-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Pipeline Status</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <PhaseWaterCard
              phaseTitle="Phase 1: Upload & AI Extraction"
              status={
                isProcessing ? "Running" : isReady ? "Completed" : "Not Started"
              }
              substep={
                isProcessing
                  ? `${currentStage} (${progress}%)`
                  : isReady
                    ? "Questions available"
                    : currentStage
              }
              icon={isProcessing ? Zap : CheckCircle}
              fillLevel={phase1FillLevel}
              fillTone={phase1Tone}
            />

            <PhaseWaterCard
              phaseTitle="Phase 2: Review & Export"
              status={isReady ? "Ready" : "Waiting"}
              substep={
                isReady
                  ? `${questions.length} questions to review`
                  : "Add questions first"
              }
              icon={CheckCircle}
              fillLevel={phase2FillLevel}
              fillTone={phase2Tone}
            />
          </div>
        </div>

        <div className="surface-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to={`/session/${mocktest.id}`}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <Play className="w-4 h-4 text-emerald-500" /> Start Full Test
            </Link>
            <button
              onClick={() => setActiveTab("output")}
              disabled={!isReady}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-[#ea580c] px-4 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#c2410c] disabled:opacity-40"
            >
              <Download className="w-4 h-4" /> Export JSON
            </button>
            <button
              onClick={() => setActiveTab("review")}
              disabled={!isReady}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-40 dark:text-amber-400"
            >
              <AlertCircle className="w-4 h-4 text-amber-500" /> Review
              Questions
            </button>
            <button
              onClick={onReprocess}
              disabled={isProcessing}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4 text-orange-500" /> Reprocess
            </button>
            <Link
              to={`/cluster/${clusterId}/mock/${mocktest.id}/editor`}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:col-span-2"
            >
              <FileText className="w-4 h-4 text-orange-500" /> Edit Questions
            </Link>
          </div>
        </div>

        {topics.length > 0 && (
          <div className="surface-card rounded-2xl p-6 border border-border">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-500" /> Topic-wise Practice
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {topics.map((topic) => (
                <Link
                  key={topic}
                  to={`/session/${mocktest.id}?topic=${encodeURIComponent(topic)}`}
                  className="flex items-center gap-2 px-3.5 py-2.5 border border-border bg-card text-foreground font-medium rounded-xl hover:border-orange-500/40 hover:bg-muted transition-colors text-xs sm:text-sm truncate"
                >
                  <Play className="w-3.5 h-3.5 text-orange-500 shrink-0" />{" "}
                  {topic}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-bold text-foreground mb-4">Activity Log</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-orange-500" />
            <div>
              <span className="text-xs text-muted-foreground">
                {formatDate(mocktest.created_at)}
              </span>
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Mock test created
              </p>
            </div>
          </div>
          {questions.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-emerald-500" />
              <div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(mocktest.updated_at)}
                </span>
                <p className="text-xs sm:text-sm font-medium text-foreground">
                  Questions saved: {questions.length}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
