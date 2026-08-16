import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Clock,
  FileText,
  Globe,
  Play,
  RotateCcw,
  Share2,
  Trash2,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { useMockTestWorkspace } from "@/hooks/useMockTestWorkspace";
import { useAuth } from "@/lib/AuthContext";
import { tabs, buildProcessingSteps } from "@/utils/mockTestHelpers";
import OverviewTab from "../components/cluster/OverviewTab";
import ProcessingTab from "../components/cluster/ProcessingTab";
import ReviewTab from "../components/cluster/ReviewTab";
import OutputTab from "../components/cluster/OutputTab";
import SubmissionsTab from "../components/cluster/SubmissionsTab";
import ShareLinkModal from "../components/cluster/ShareLinkModal";
import { ConfirmDialog } from "../components/design-system/ConfirmDialog";

export default function MockTestWorkspace() {
  const { isViewer } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const {
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
    stats,
    metadata,
    handleUpload,
    handleReprocess,
    handlePublish,
    handleQuestionStatusChange,
    handleQuestionDelete,
    handleDelete,
  } = useMockTestWorkspace();

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

  const { lowConfidence, topicsFound, approvedCount } = stats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
        <Link
          to={`/cluster/${clusterId}`}
          className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-orange-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {cluster?.name || "Cluster"}
        </Link>

        {clusterMockTests.length > 0 && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {clusterMockTests.map((item, index) => {
                const isActive = item.id === mocktest.id;

                return (
                  <Fragment key={item.id}>
                    {index > 0 && <div className="h-5 w-px bg-border" />}
                    <Link
                      to={`/cluster/${clusterId}/mocktest/${item.id}`}
                      className={
                        isActive
                          ? "text-sm font-semibold text-orange-500"
                          : "text-sm font-medium text-muted-foreground hover:text-orange-500 transition-colors"
                      }
                    >
                      {item.name}
                    </Link>
                  </Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>

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
            {mocktest.status !== "published" && (
              <button
                disabled={
                  isViewer ||
                  questions.length === 0 ||
                  mocktest.status === "processing"
                }
                onClick={() =>
                  !isViewer && questions.length > 0 && handlePublish()
                }
                title={
                  isViewer
                    ? "Editor role is required to publish"
                    : questions.length === 0
                      ? "Add or extract at least one question before publishing"
                      : mocktest.status === "processing"
                        ? "Wait for extraction to finish before publishing"
                        : "Publish this mock test"
                }
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 border font-semibold rounded-xl transition-all text-xs sm:text-sm sm:flex-none ${
                  isViewer ||
                  questions.length === 0 ||
                  mocktest.status === "processing"
                    ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                }`}
              >
                <Globe className="w-4 h-4" /> Publish
              </button>
            )}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-semibold rounded-xl hover:bg-orange-500/20 transition-all text-xs sm:text-sm sm:flex-none"
            >
              <Share2 className="w-4 h-4 text-orange-500" /> Share
            </button>
            <button
              disabled={isViewer}
              onClick={() => !isViewer && setShowReprocessConfirm(true)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                isViewer
                  ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-50"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-orange-500/40"
              }`}
              title={
                isViewer
                  ? "Editor role is required to reprocess"
                  : "Re-extract from the original PDF"
              }
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              disabled={isViewer}
              onClick={() => !isViewer && setShowDeleteConfirm(true)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                isViewer
                  ? "border-red-500/10 text-red-500/30 cursor-not-allowed opacity-50"
                  : "border-red-500/20 text-muted-foreground hover:text-red-500 hover:border-red-500/40"
              }`}
              title={
                isViewer
                  ? "Editor role is required to delete mock test"
                  : "Delete"
              }
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
          onUpload={handleUpload}
          isViewer={isViewer}
        />
      )}
      {activeTab === "processing" && (
        <ProcessingTab
          steps={buildProcessingSteps(mocktest, latestJob)}
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
            // Only present when the mock test came from a template with at
            // least one section carrying its own marksPerCorrect/
            // negativeMarksPerWrong (see ai/provider.py#_apply_section_marks)
            // - omitted from the array entirely otherwise, same as the
            // templateMatch line would be if we surfaced that here too.
            aiSummary.sectionMarksApplied?.questionsMatched
              ? `Applied section-specific marking to ${aiSummary.sectionMarksApplied.questionsMatched} question(s).`
              : null,
            `${questions.length} question(s) currently saved.`,
          ].filter(Boolean)}
        />
      )}
      {activeTab === "review" && (
        <ReviewTab
          questions={questions}
          onStatusChange={handleQuestionStatusChange}
          onDelete={handleQuestionDelete}
          clusterId={clusterId}
          mockTestId={mocktest.id}
        />
      )}
      {activeTab === "output" && (
        <OutputTab
          questions={questions}
          metadata={metadata}
          mockTestId={mocktest.id}
        />
      )}
      {activeTab === "submissions" && (
        <SubmissionsTab
          submissions={submissions}
          isLoading={isLoadingSubmissions}
        />
      )}

      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        mockTestId={mocktest.id}
      />

      {showDeleteConfirm && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title={`Delete "${mocktest?.name}"?`}
          description="Are you sure you want to delete this mock test and all its questions? This action cannot be undone."
          confirmLabel="Delete Mock Test"
          destructive={true}
          onConfirm={async () => {
            setShowDeleteConfirm(false);
            await handleDelete();
          }}
        />
      )}

      {showReprocessConfirm && (
        <ConfirmDialog
          open={showReprocessConfirm}
          onOpenChange={setShowReprocessConfirm}
          title="Re-extract from the original PDF?"
          description={
            questions.length > 0
              ? `This re-runs extraction on the original PDF using the latest pipeline (useful if this mock test was extracted before a formatting fix) and replaces all ${questions.length} current question(s). Any manual edits, approvals, or flags made in the Review tab will be lost.`
              : "This re-runs extraction on the original PDF using the latest pipeline."
          }
          confirmLabel="Re-extract"
          destructive={questions.length > 0}
          onConfirm={async () => {
            setShowReprocessConfirm(false);
            await handleReprocess();
          }}
        />
      )}
    </div>
  );
}
