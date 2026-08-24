import { useState } from "react";
import { FileText } from "lucide-react";
import { useMockTestWorkspace } from "@/hooks/useMockTestWorkspace";
import { useAuth } from "@/lib/AuthContext";
import { tabs } from "@/utils/mockTestHelpers";
import WorkspaceBreadcrumbs from "../components/cluster/WorkspaceBreadcrumbs";
import WorkspaceHeader from "../components/cluster/WorkspaceHeader";
import WorkspaceStatsGrid from "../components/cluster/WorkspaceStatsGrid";
import WorkspaceTabsBar from "../components/cluster/WorkspaceTabsBar";
import WorkspaceTabPanels from "../components/cluster/WorkspaceTabPanels";
import WorkspaceConfirmDialogs from "../components/cluster/WorkspaceConfirmDialogs";

export default function MockTestWorkspace() {
  const { isViewer } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const {
    clusterId,
    cluster,
    clusterMockTests,
    mocktest,
    isLoading,
    latestJob,
    isGenerated,
    generationSources,
    questions,
    submissions,
    isLoadingSubmissions,
    ocrSummary,
    aiSummary,
    activeTab,
    setActiveTab,
    actionError,
    status,
    isProcessing,
    stats,
    metadata,
    handleUpload,
    handleReprocess,
    handleCancelProcessing,
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
      <WorkspaceBreadcrumbs
        clusterId={clusterId}
        clusterName={cluster?.name}
        currentMockTestId={mocktest.id}
        clusterMockTests={clusterMockTests}
      />

      <div className="surface-card rounded-2xl p-4 sm:p-6 border border-border">
        <WorkspaceHeader
          mocktest={mocktest}
          isGenerated={isGenerated}
          generationSources={generationSources}
          status={status}
          isProcessing={isProcessing}
          questionsCount={questions.length}
          clusterId={clusterId}
          isViewer={isViewer}
          actionError={actionError}
          onPublish={handlePublish}
          onShare={() => setShowShareModal(true)}
          onReprocessOrCancel={() =>
            isProcessing
              ? setShowCancelConfirm(true)
              : setShowReprocessConfirm(true)
          }
          onDelete={() => setShowDeleteConfirm(true)}
        />

        <WorkspaceStatsGrid
          totalQuestions={mocktest.total_questions || questions.length}
          approvedCount={approvedCount}
          lowConfidence={lowConfidence}
          topicsFound={topicsFound}
        />
      </div>

      <WorkspaceTabsBar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <WorkspaceTabPanels
        activeTab={activeTab}
        mocktest={mocktest}
        questions={questions}
        latestJob={latestJob}
        clusterId={clusterId}
        setActiveTab={setActiveTab}
        handleReprocess={handleReprocess}
        onCancelProcessing={() => setShowCancelConfirm(true)}
        handleUpload={handleUpload}
        isViewer={isViewer}
        isGenerated={isGenerated}
        ocrSummary={ocrSummary}
        aiSummary={aiSummary}
        handleQuestionStatusChange={handleQuestionStatusChange}
        handleQuestionDelete={handleQuestionDelete}
        metadata={metadata}
        submissions={submissions}
        isLoadingSubmissions={isLoadingSubmissions}
      />

      <WorkspaceConfirmDialogs
        mocktest={mocktest}
        questionsCount={questions.length}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleDelete={handleDelete}
        showReprocessConfirm={showReprocessConfirm}
        setShowReprocessConfirm={setShowReprocessConfirm}
        handleReprocess={handleReprocess}
        showCancelConfirm={showCancelConfirm}
        setShowCancelConfirm={setShowCancelConfirm}
        handleCancelProcessing={handleCancelProcessing}
      />
    </div>
  );
}
