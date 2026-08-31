import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileImage, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { ConfirmDialog } from "../design-system/ConfirmDialog";
import PdfPageFetchModal from "./PdfPageFetchModal";

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

// Part C: the manual escape hatch for when extraction never found a
// diagram (or found the wrong one) - see migration 015. Deliberately a
// single control that handles both "insert" (no diagram yet) and
// "replace" (one already exists, extracted or manual) - the backend does
// the same thing either way (upsertAssetForSlot), so the UI doesn't need
// to know which case it's in beyond the button label and confirm copy.
//
// Position is no longer this control's concern - a 'default' slot image
// renders wherever its ![[img:default]] marker sits in the question's
// own text (exactly like every other inline image), so a brand-new
// upload (no existing marker anywhere) appends that marker to the end of
// the question text via onInsertDefaultMarker, right after the upload
// succeeds. From then on, moving the image is just editing the text -
// cut the marker, paste it wherever it belongs, same as Word.
//
// "Fetch from PDF" stays: reviewers can pull a page image from the source
// PDF in B2 (via the worker render endpoint) and crop it here, without
// uploading from their device. That path shares acceptFile with the
// normal file picker so confirm/upload/error behavior is identical.
export default function DiagramUploadControl({
  questionId,
  mockTestId,
  diagramUrl,
  source,
  sourcePage,
  isViewer,
  onError,
  onInsertDefaultMarker,
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPdfFetchModal, setShowPdfFetchModal] = useState(false);
  const [localError, setLocalError] = useState("");

  const hasDiagram = Boolean(diagramUrl);
  const busy = isUploading || isDeleting;

  const invalidateQuestions = () =>
    queryClient.invalidateQueries({
      queryKey: ["questions", mockTestId],
      refetchType: "active",
    });

  const reportError = (msg) => {
    setLocalError(msg);
    onError?.(msg);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setLocalError("");
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reportError("Images must be 6MB or smaller");
      return;
    }

    acceptFile(file);
  };

  // Shared by handleFileChange (real file input) and handlePdfCropped
  // (File synthesized from a canvas crop of a fetched PDF page).
  const acceptFile = (file) => {
    if (hasDiagram) {
      setPendingFile(file);
    } else {
      void doUpload(file);
    }
  };

  const handlePdfCropped = (file) => {
    setShowPdfFetchModal(false);
    acceptFile(file);
  };

  const formatUploadError = (error) => {
    if (!error) return "Could not upload image to cloud storage";

    if (
      error.name === "TypeError" ||
      error.message === "Failed to fetch" ||
      /network|offline|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(
        error.message || "",
      )
    ) {
      return "Network error — check your connection and try again";
    }

    const status = error.status ?? error.statusCode ?? error.response?.status;
    if (status === 413) {
      return "Image is too large for the server to accept";
    }
    if (status === 400) {
      return error.message || "This file could not be processed as an image";
    }
    if (status === 401 || status === 403) {
      return "You do not have permission to update this diagram";
    }
    if (status === 404) {
      return "Question not found — it may have been deleted";
    }
    if (status === 503) {
      return (
        error.message || "Cloud image storage is not configured on the server"
      );
    }
    if (status === 502 || status >= 500) {
      return (
        error.message ||
        "Cloud storage failed to save the image. Please try again"
      );
    }

    return (
      error.message || error.error || "Could not upload image to cloud storage"
    );
  };

  const doUpload = async (file) => {
    if (!file) return;
    const isFreshInsert = !hasDiagram;
    setIsUploading(true);
    setLocalError("");
    try {
      await api.uploadDiagramImage(questionId, file);
      // Insert the inline marker BEFORE refetching so the merge logic in
      // useQuestionEditor sees content as dirty and keeps the marker
      // instead of overwriting with server text that has no marker yet.
      if (isFreshInsert) {
        onInsertDefaultMarker?.();
        // Let React commit the text update before questions refetch merges
        // state — otherwise the merge can run against the pre-marker text
        // and drop the marker.
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      }
      try {
        await invalidateQuestions();
      } catch (invalidateError) {
        console.warn(
          "Diagram uploaded but question list failed to refresh:",
          invalidateError,
        );
        reportError(
          "Image uploaded, but the preview did not refresh. Reload the page to see the new image.",
        );
        return;
      }
    } catch (error) {
      console.error("Diagram upload failed:", error);
      reportError(formatUploadError(error));
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setLocalError("");
    try {
      await api.deleteDiagramImage(questionId);
      try {
        await invalidateQuestions();
      } catch (invalidateError) {
        console.warn(
          "Diagram deleted but question list failed to refresh:",
          invalidateError,
        );
        reportError(
          "Image removed, but the preview did not refresh. Reload the page.",
        );
        return;
      }
    } catch (error) {
      console.error("Diagram delete failed:", error);
      reportError(
        formatUploadError(error).replace(
          /upload image to cloud storage/i,
          "remove image",
        ) || "Could not remove image",
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-2 mt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileChange}
          disabled={isViewer || busy}
        />

        <button
          type="button"
          disabled={isViewer || busy}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
            isViewer || busy
              ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "text-orange-500 hover:underline"
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {hasDiagram ? "Replace Image" : "Insert Image"}
        </button>

        <button
          type="button"
          disabled={isViewer || busy}
          onClick={() => setShowPdfFetchModal(true)}
          title="Fetch a page image straight from the original PDF instead of uploading your own file"
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
            isViewer || busy
              ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "text-orange-500 hover:underline"
          }`}
        >
          <FileImage className="w-3.5 h-3.5" />
          Fetch from PDF
        </button>

        {hasDiagram && (
          <button
            type="button"
            disabled={isViewer || busy}
            onClick={() => setShowDeleteConfirm(true)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
              isViewer || busy
                ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
                : "text-red-500 hover:underline"
            }`}
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Remove
          </button>
        )}

        {pendingFile && (
          <ConfirmDialog
            open={Boolean(pendingFile)}
            onOpenChange={(open) => !open && setPendingFile(null)}
            title="Replace this diagram?"
            description={
              source === "manual"
                ? "This will replace your previously uploaded image. This can't be undone."
                : "This will replace the diagram automatically extracted from the PDF. This can't be undone - if you want it back later, you'll need to re-extract from the original PDF."
            }
            confirmLabel="Replace"
            destructive
            onConfirm={() => doUpload(pendingFile)}
          />
        )}

        {showDeleteConfirm && (
          <ConfirmDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            title="Remove this diagram?"
            description="This removes the image from the question entirely. This can't be undone."
            confirmLabel="Remove"
            destructive
            onConfirm={handleDelete}
          />
        )}

        {showPdfFetchModal && (
          <PdfPageFetchModal
            mockTestId={mockTestId}
            defaultPage={sourcePage}
            onClose={() => setShowPdfFetchModal(false)}
            onCropped={handlePdfCropped}
          />
        )}
      </div>

      {localError && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
          <span>{localError}</span>
          <button
            type="button"
            onClick={() => setLocalError("")}
            className="text-red-500 hover:text-red-600 font-bold ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
