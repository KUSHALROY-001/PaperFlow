import { X } from "lucide-react";
import {
  useCreateMockTestForm,
  CREATE_MOCK_TEST_STEPS,
} from "@/hooks/useCreateMockTestForm";
import CreateMockTestStepIndicator from "./CreateMockTestStepIndicator";
import CreateMockTestModeSelector from "./CreateMockTestModeSelector";
import CreateMockTestUploadPanel from "./CreateMockTestUploadPanel";
import CreateMockTestGeneratePanel from "./CreateMockTestGeneratePanel";
import CreateMockTestBasicsStep from "./CreateMockTestBasicsStep";
import CreateMockTestSettingsStep from "./CreateMockTestSettingsStep";
import CreateMockTestReviewStep from "./CreateMockTestReviewStep";
import CreateMockTestFooter from "./CreateMockTestFooter";

// Promoted from an inline component inside pages/ClusterWorkspace.jsx - no
// behavior change from that. Split further once this crossed 1000 lines
// as one file: all state/derived-values/submit logic now lives in
// useCreateMockTestForm.js (mirrors how useTemplateForm.js/
// useQuestionForm.js already split their own modals), each step's fields
// live in their own CreateMockTest*.jsx component, and this file is left
// as pure wiring - render the header, the step indicator, whichever
// step's component is current, and the footer.
//
// Content Source is step 1, not Basics, because it decides what several
// LATER fields even mean - e.g. whether "Name" (step 2) is required or
// just an optional batch-mode prefix (isBatchMode, from
// useCreateMockTestForm). Asking it first means every later step can
// react to what was already decided instead of the old single-page form,
// where the mode picker sat near the bottom despite driving fields above
// it.
export default function CreateMockTestModal({ clusterId, onClose }) {
  const f = useCreateMockTestForm({ clusterId, onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-4 py-4 sm:py-8 backdrop-blur-xs sm:items-center">
      <div
        data-tour="mock-wizard"
        className="flex max-h-[90dvh] sm:max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl sm:rounded-3xl surface-card border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-6 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Add Mock Test
            </h2>
            <p className="text-xs text-muted-foreground">
              Create a mock test inside this cluster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CreateMockTestStepIndicator
          steps={CREATE_MOCK_TEST_STEPS}
          currentStep={f.currentStep}
        />

        <form
          onSubmit={f.handleSubmit}
          onKeyDown={(event) => {
            // A single-line <input>'s native Enter behavior is to submit
            // the nearest form - fine on the final step (that's literally
            // the submit action), but on every earlier step it would fire
            // handleSubmit before the user ever reaches Review. Textareas
            // don't trigger this (Enter inserts a newline there), so
            // nothing needs excluding for Description.
            if (
              event.key === "Enter" &&
              f.currentStep !== CREATE_MOCK_TEST_STEPS.length
            ) {
              event.preventDefault();
            }
          }}
          className="min-h-0 flex-1 space-y-4 sm:space-y-5 overflow-y-auto p-4 sm:p-6 overscroll-contain"
        >
          {f.currentStep === 1 && (
            <>
              <CreateMockTestModeSelector mode={f.mode} setMode={f.setMode} />
              {f.mode === "upload" && (
                <CreateMockTestUploadPanel
                  selectedFiles={f.selectedFiles}
                  onFilesPicked={f.handleFilesPicked}
                  onReorderFiles={f.setSelectedFiles}
                  onRemoveFile={f.removeFile}
                  uploadMode={f.uploadMode}
                  setUploadMode={f.setUploadMode}
                  isBatchMode={f.isBatchMode}
                  documentType={f.documentType}
                  setDocumentType={f.setDocumentType}
                  desiredQuestionCount={f.desiredQuestionCount}
                  setDesiredQuestionCount={f.setDesiredQuestionCount}
                />
              )}
              {f.mode === "generate" && (
                <CreateMockTestGeneratePanel
                  uid={f.uid}
                  isLoadingSources={f.isLoadingSources}
                  availableSources={f.availableSources}
                  selectedSourceIds={f.selectedSourceIds}
                  toggleSource={f.toggleSource}
                  targetQuestionCount={f.targetQuestionCount}
                  setTargetQuestionCount={f.setTargetQuestionCount}
                  difficultyHint={f.difficultyHint}
                  setDifficultyHint={f.setDifficultyHint}
                />
              )}
            </>
          )}

          {f.currentStep === 2 && (
            <CreateMockTestBasicsStep
              uid={f.uid}
              isBatchMode={f.isBatchMode}
              form={f.form}
              updateForm={f.updateForm}
            />
          )}

          {f.currentStep === 3 && (
            <CreateMockTestSettingsStep
              uid={f.uid}
              form={f.form}
              updateForm={f.updateForm}
            />
          )}

          {f.currentStep === 4 && (
            <CreateMockTestReviewStep
              mode={f.mode}
              isBatchMode={f.isBatchMode}
              selectedFiles={f.selectedFiles}
              documentType={f.documentType}
              desiredQuestionCount={f.desiredQuestionCount}
              form={f.form}
              targetQuestionCount={f.targetQuestionCount}
              difficultyHint={f.difficultyHint}
              selectedSourceIds={f.selectedSourceIds}
              availableSources={f.availableSources}
            />
          )}

          {f.error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
              {f.error}
            </div>
          )}

          <CreateMockTestFooter
            currentStep={f.currentStep}
            totalSteps={CREATE_MOCK_TEST_STEPS.length}
            onClose={onClose}
            onBack={f.goToPreviousStep}
            onNext={f.goToNextStep}
            isSubmitting={f.isSubmitting}
            isViewer={f.isViewer}
            isBatchMode={f.isBatchMode}
            selectedFilesCount={f.selectedFiles.length}
            mode={f.mode}
            batchProgress={f.batchProgress}
          />
        </form>
      </div>
    </div>
  );
}
