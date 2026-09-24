import { Loader2 } from "lucide-react";

export default function CreateMockTestFooter({
  currentStep,
  totalSteps,
  onClose,
  onBack,
  onNext,
  isSubmitting,
  isViewer,
  isBatchMode,
  selectedFilesCount,
  mode,
  batchProgress,
}) {
  const isLastStep = currentStep >= totalSteps;

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
      <button
        type="button"
        onClick={currentStep === 1 ? onClose : onBack}
        className="flex-1 rounded-md border border-border py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground transition-all hover:bg-muted"
      >
        {currentStep === 1 ? "Cancel" : "Back"}
      </button>
      {!isLastStep ? (
        <button
          type="button"
          data-tour="mock-next"
          onClick={onNext}
          className="flex-1 rounded-md bg-blue-500 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600"
        >
          Next
        </button>
      ) : (
        <button
          type="submit"
          data-tour="mock-next"
          disabled={isSubmitting || isViewer}
          title={
            isViewer ? "Editor role is required to add mock tests" : undefined
          }
          className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-xs sm:text-sm font-semibold text-white transition-all shadow-sm ${
            isViewer
              ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {batchProgress
                  ? `Creating ${batchProgress.done} of ${batchProgress.total}...`
                  : mode === "generate"
                    ? "Generating..."
                    : "Creating..."}
              </span>
            </>
          ) : (
            <span>
              {isBatchMode
                ? `Add ${selectedFilesCount} Mock Tests`
                : "Add Mock Test"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
