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
  // Separate from questions.length because the Processing tab no longer
  // fetches the question list at all - see useMockTestWorkspace.
  questionCount = 0,
  // Drives the "still filling in" banner on Review/Output. isProcessing
  // means new questions are actively being extracted and committed;
  // isStreamingQuestions means the client is still fetching pages of a
  // list that already exists. See LiveExtractionBanner.
  isProcessing = false,
  isStreamingQuestions = false,
  loadedQuestionCount = 0,
  hasMoreQuestions = false,
  onLoadMoreQuestions,
  onLoadThroughQuestion,
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
  handleRestoreStaleQuestion,
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
            questionsCount: questionCount,
          })}
        />
      )}
      {activeTab === "review" && (
        <ReviewTab
          questions={questions}
          isProcessing={isProcessing}
          isStreamingQuestions={isStreamingQuestions}
          loadedQuestionCount={loadedQuestionCount}
          totalQuestionCount={questionCount}
          hasMoreQuestions={hasMoreQuestions}
          onLoadMoreQuestions={onLoadMoreQuestions}
          onLoadThroughQuestion={onLoadThroughQuestion}
          mocktest={mocktest}
          onStatusChange={handleQuestionStatusChange}
          onDelete={handleQuestionDelete}
          onRestoreStale={handleRestoreStaleQuestion}
          clusterId={clusterId}
          mockTestId={mocktest.id}
        />
      )}
      {activeTab === "output" && (
        <OutputTab
          questions={questions}
          isProcessing={isProcessing}
          isStreamingQuestions={isStreamingQuestions}
          loadedQuestionCount={loadedQuestionCount}
          totalQuestionCount={questionCount}
          hasMoreQuestions={hasMoreQuestions}
          onLoadMoreQuestions={onLoadMoreQuestions}
          onLoadThroughQuestion={onLoadThroughQuestion}
          mocktest={mocktest}
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
