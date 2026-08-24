import ShareLinkModal from "./ShareLinkModal";
import { ConfirmDialog } from "../design-system/ConfirmDialog";

export default function WorkspaceConfirmDialogs({
  mocktest,
  questionsCount = 0,
  showShareModal,
  setShowShareModal,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDelete,
  showReprocessConfirm,
  setShowReprocessConfirm,
  handleReprocess,
  showCancelConfirm,
  setShowCancelConfirm,
  handleCancelProcessing,
}) {
  if (!mocktest) return null;

  return (
    <>
      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        mockTestId={mocktest.id}
        mocktest={mocktest}
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
            questionsCount > 0
              ? `This re-runs extraction on the original PDF using the latest pipeline (useful if this mock test was extracted before a formatting fix) and replaces all ${questionsCount} current question(s). Any manual edits, approvals, or flags made in the Review tab will be lost.`
              : "This re-runs extraction on the original PDF using the latest pipeline."
          }
          confirmLabel="Re-extract"
          destructive={questionsCount > 0}
          onConfirm={async () => {
            setShowReprocessConfirm(false);
            await handleReprocess();
          }}
        />
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          open={showCancelConfirm}
          onOpenChange={setShowCancelConfirm}
          title="Cancel processing?"
          description="This stops the current extraction job. Nothing extracted so far will be saved - once cancelled, you can start a fresh reprocess."
          confirmLabel="Cancel Processing"
          destructive={true}
          onConfirm={async () => {
            setShowCancelConfirm(false);
            await handleCancelProcessing();
          }}
        />
      )}
    </>
  );
}
