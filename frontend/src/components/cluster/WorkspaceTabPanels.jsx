import {
  buildDocumentPreview,
  buildProcessingSteps,
} from "@/utils/mockTestHelpers";
import OverviewTab from "./OverviewTab";
import ProcessingTab from "./ProcessingTab";
import ReviewTab from "./ReviewTab";
import OutputTab from "./OutputTab";
import SubmissionsTab from "./SubmissionsTab";

export default function WorkspaceTabPanels({
  activeTab,
  mocktest,
  questions = [],
  latestJob,
  clusterId,
  setActiveTab,
  handleReprocess,
  onCancelProcessing,
  handleUpload,
  isViewer,
  isGenerated,
  ocrSummary,
  aiSummary,
  handleQuestionStatusChange,
  handleQuestionDelete,
  metadata,
  submissions = [],
  isLoadingSubmissions,
}) {
  return (
    <>
      {activeTab === "overview" && (
        <OverviewTab
          mocktest={mocktest}
          questions={questions}
          latestJob={latestJob}
          clusterId={clusterId}
          setActiveTab={setActiveTab}
          onReprocess={handleReprocess}
          onCancelProcessing={onCancelProcessing}
          onUpload={handleUpload}
          isViewer={isViewer}
        />
      )}
      {activeTab === "processing" && (
        <ProcessingTab
          steps={buildProcessingSteps(mocktest, latestJob)}
          job={latestJob}
          isGenerated={isGenerated}
          documentPreview={buildDocumentPreview({
            latestJob,
            isGenerated,
            aiSummary,
            ocrSummary,
            questionsCount: questions.length,
          })}
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
    </>
  );
}
