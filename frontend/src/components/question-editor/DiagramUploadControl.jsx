import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { ConfirmDialog } from "../design-system/ConfirmDialog";

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp";

const PLACEMENT_OPTIONS = [
  { value: "above_text", label: "Top" },
  { value: "below_text", label: "Middle" },
  { value: "below_options", label: "Bottom" },
];

// Part C: the manual escape hatch for when extraction never found a
// diagram (or found the wrong one) - see migration 015. Deliberately a
// single control that handles both "insert" (no diagram yet) and
// "replace" (one already exists, extracted or manual) - the backend does
// the same thing either way (replaceAssetForQuestion deletes-then-inserts),
// so the UI doesn't need to know which case it's in beyond the button
// label and confirm copy.
export default function DiagramUploadControl({
  questionId,
  mockTestId,
  diagramUrl,
  placement,
  source,
  isViewer,
  onError,
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlacementSaving, setIsPlacementSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

    // Replacing an existing diagram is destructive (it permanently
    // discards whatever was extracted or previously uploaded, along with
    // any manual crop on it) - confirm first, with wording that names
    // what's actually being replaced. Inserting into an empty slot needs
    // no confirmation - there's nothing to lose yet.
    if (hasDiagram) {
      setPendingFile(file);
    } else {
      void doUpload(file);
    }
  };

  const formatUploadError = (error) => {
    if (!error) return "Could not upload image to cloud storage";

    // Network / offline
    if (
      error.name === "TypeError" ||
      error.message === "Failed to fetch" ||
      /network|offline|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(
        error.message || "",
      )
    ) {
      return "Network error — check your connection and try again";
    }

    // Explicit status from API client (common pattern in this codebase)
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
    setIsUploading(true);
    setLocalError("");
    try {
      await api.uploadDiagramImage(questionId, file);
      // Invalidate after a successful upload so the versioned diagramUrl
      // refreshes. A failure here still means the image is stored — surface
      // a softer message so the user knows to refresh rather than re-upload.
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

  const handlePlacementChange = async (nextPlacement) => {
    if (nextPlacement === placement) return;
    setIsPlacementSaving(true);
    setLocalError("");
    try {
      await api.updateDiagramPlacement(questionId, nextPlacement);
      await invalidateQuestions();
    } catch (error) {
      console.error("Diagram placement update failed:", error);
      reportError(error.message || "Could not update placement");
    } finally {
      setIsPlacementSaving(false);
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

        {hasDiagram && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Position
            </span>
            <div className="flex items-center rounded-md border border-border p-0.5">
              {PLACEMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isViewer || busy || isPlacementSaving}
                  onClick={() => handlePlacementChange(option.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all disabled:opacity-50 ${
                    placement === option.value
                      ? "bg-orange-500/15 text-orange-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
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
