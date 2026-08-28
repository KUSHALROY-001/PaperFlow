import { useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useQueryClient } from "@tanstack/react-query";
import { Crop, Loader2, X } from "lucide-react";
import { api, resolveAssetUrl } from "@/lib/api";

const ASPECT_PRESETS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

// Switched from react-easy-crop to react-image-crop: react-easy-crop only
// ever offers a fixed-aspect frame that you pan/zoom the image underneath -
// there's no way to drag a single edge independently, so "crop off just
// the left side" (a lopsided, non-aspect-locked rectangle) was never
// actually possible with it, regardless of which "Free" preset was
// selected. react-image-crop's crop box has real per-edge/per-corner
// drag handles - "Free" here now means a genuinely arbitrary rectangle,
// not just "start at the image's own aspect ratio".
//
// Crops against diagramUrl - the SAME image the rest of the app renders,
// not a separate pristine original (see migration
// 022_diagram_single_image.sql: there's only ever one stored image per
// diagram now). A second crop therefore starts from the first crop's
// result, not a fresh original - there is no "reset to auto-crop" option
// anymore, since nothing is kept to reset to.
export default function DiagramCropModal({
  questionId,
  mockTestId,
  diagramUrl,
  onClose,
}) {
  const queryClient = useQueryClient();
  const imageUrl = resolveAssetUrl(diagramUrl);
  const imgRef = useRef(null);

  const [aspectPreset, setAspectPreset] = useState(undefined);
  // Percent unit throughout, not pixel - keeps the crop box correct across
  // window resizes/zoom levels without any manual displayed-vs-natural
  // scale-factor bookkeeping. Only converted to natural-image pixel
  // coordinates once, in handleSave, which is the one place that actually
  // needs pixel space (the backend crops against storage_path's real
  // dimensions).
  const [crop, setCrop] = useState({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const currentImageUrl =
    retryCount > 0
      ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}_r=${retryCount}`
      : imageUrl;

  const busy = isSaving;

  function onImageLoad() {
    setImageLoaded(true);
    setImageError(false);
    // Full-image crop by default - "give a large image, crop it down"
    // means starting from everything selected, not a pre-clipped guess.
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
    setCompletedCrop(null);
  }

  function onImageError() {
    setImageLoaded(false);
    setImageError(true);
  }

  function handleRetryImage() {
    setImageError(false);
    setImageLoaded(false);
    setRetryCount((prev) => prev + 1);
  }

  function handleAspectChange(nextAspect) {
    setAspectPreset(nextAspect);
    const img = imgRef.current;
    if (!img) return;

    if (nextAspect === undefined) {
      // Back to genuinely free-form - full image, no aspect constraint.
      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
      return;
    }

    // Re-center a crop at the new aspect using the image's actual
    // rendered dimensions (makeAspectCrop needs real pixel proportions to
    // fit the box inside the image without overflowing on one axis).
    const nextCrop = centerCrop(
      makeAspectCrop(
        { unit: "%", width: 90 },
        nextAspect,
        img.width,
        img.height,
      ),
      img.width,
      img.height,
    );
    setCrop(nextCrop);
  }

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleSave = async () => {
    const img = imgRef.current;
    if (!completedCrop || !img) return;
    setError("");
    setIsSaving(true);
    try {
      // completedCrop is a percent crop against the rendered image -
      // multiplying by naturalWidth/naturalHeight (not img.width/height,
      // which is the on-screen rendered size) is what puts it in the
      // same pixel space as the image on the backend.
      await api.updateDiagramCrop(questionId, {
        x: Math.round((completedCrop.x / 100) * img.naturalWidth),
        y: Math.round((completedCrop.y / 100) * img.naturalHeight),
        width: Math.round((completedCrop.width / 100) * img.naturalWidth),
        height: Math.round((completedCrop.height / 100) * img.naturalHeight),
      });
      // Refetch ["questions", mockTestId] so attachDiagramUrls rebuilds
      // diagramUrl with a new ?v=<created_at> (touchAsset bumps it on
      // crop). Same public_id, new version - that's what actually gets
      // the cropped bytes onto the preview instead of a cached PNG.
      await queryClient.invalidateQueries({
        queryKey: ["questions", mockTestId],
      });
      onClose();
    } catch (err) {
      console.error("Diagram crop save failed:", err);
      const status = err.status ?? err.statusCode ?? err.response?.status;
      let message = err.message || "Could not save crop";
      if (
        err.name === "TypeError" ||
        err.message === "Failed to fetch" ||
        /network|offline|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(
          err.message || "",
        )
      ) {
        message = "Network error — check your connection and try again";
      } else if (status === 400) {
        message = err.message || "Crop area is invalid for this image";
      } else if (status === 404) {
        message = "Diagram not found — it may have been removed";
      } else if (status === 502 || status === 503 || status >= 500) {
        message =
          err.message ||
          "Cloud storage failed to save the crop. Please try again";
      }
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 backdrop-blur-xs sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500/15 text-orange-500">
              <Crop className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Edit Diagram Crop
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag any edge or corner to crop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="relative flex min-h-64 max-h-72 sm:max-h-96 w-full items-center justify-center overflow-hidden rounded-2xl bg-muted border border-border">
            {!imageError ? (
              <ReactCrop
                crop={crop}
                aspect={aspectPreset}
                onChange={(_pixelCrop, percentCrop) => setCrop(percentCrop)}
                onComplete={(_pixelCrop, percentCrop) =>
                  setCompletedCrop(percentCrop)
                }
                className="max-h-72 sm:max-h-96"
              >
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  key={currentImageUrl}
                  ref={imgRef}
                  src={currentImageUrl}
                  onLoad={onImageLoad}
                  onError={onImageError}
                  className={`max-h-72 sm:max-h-96 w-auto transition-opacity duration-200 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              </ReactCrop>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-xs">
                <p className="font-bold text-red-500 mb-1">
                  Could not load diagram image for cropping
                </p>
                <p className="text-muted-foreground mb-3 max-w-sm">
                  The image file could not be retrieved from Cloudinary cloud
                  storage.
                </p>
                <button
                  type="button"
                  onClick={handleRetryImage}
                  className="px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 font-bold text-orange-500 hover:bg-orange-500/20 transition-all"
                >
                  Retry Loading
                </button>
              </div>
            )}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-orange-500" />
                Loading image...
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Aspect
            </span>
            {ASPECT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={busy}
                onClick={() => handleAspectChange(preset.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-50 ${
                  aspectPreset === preset.value
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-500"
                    : "border-border text-muted-foreground hover:border-orange-500/30"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">
              {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border p-5 sm:p-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-md text-xs sm:text-sm font-bold text-muted-foreground hover:bg-muted transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !completedCrop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-xs sm:text-sm font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition-all disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Crop
          </button>
        </div>
      </div>
    </div>
  );
}
