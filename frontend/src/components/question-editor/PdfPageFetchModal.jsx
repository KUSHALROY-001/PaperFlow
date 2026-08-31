import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  ChevronLeft,
  ChevronRight,
  FileImage,
  Loader2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

const ASPECT_PRESETS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

// The "fetch any page from the source PDF" feature - for a question
// where extraction found no diagram, this pulls the actual PDF page
// straight from B2 (via the worker's synchronous GET /render-page - see
// backend/worker/http_server.py) instead of requiring the reviewer to
// screenshot the PDF themselves on their own device.
//
// Crops CLIENT-SIDE (via <canvas>), unlike DiagramCropModal.jsx's
// server-side crop - that one crops an image that's ALREADY a saved
// question_assets row (question_assets.storage_path). A freshly fetched
// PDF page isn't a saved asset yet, so there's nothing on the server to
// crop against; this produces a cropped File and hands it to the SAME
// upload path DiagramUploadControl.jsx already uses for a manually
// picked file (onCropped), rather than duplicating that
// confirm-before-replace/error-handling/invalidate logic here too.
export default function PdfPageFetchModal({ mockTestId, defaultPage, onClose, onCropped }) {
  const imgRef = useRef(null);
  const objectUrlRef = useRef(null);

  const [page, setPage] = useState(defaultPage && defaultPage > 0 ? defaultPage : 1);
  const [pageInput, setPageInput] = useState(String(page));
  const [totalPages, setTotalPages] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [aspectPreset, setAspectPreset] = useState(undefined);
  const [crop, setCrop] = useState({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreparingCrop, setIsPreparingCrop] = useState(false);
  const [cropError, setCropError] = useState("");

  const busy = isFetching || isPreparingCrop;

  const fetchPage = async (pageToFetch) => {
    setIsFetching(true);
    setFetchError("");
    setImageLoaded(false);
    setCompletedCrop(null);
    try {
      const { blob, totalPages: total } = await api.fetchPdfPage(
        mockTestId,
        pageToFetch,
      );
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setImageUrl(url);
      if (total) setTotalPages(total);
    } catch (error) {
      // Mirrors DiagramUploadControl.jsx's own network/status-code
      // messaging conventions, so a connection problem or a busy/cold
      // worker reads the same way here as it does everywhere else in
      // the editor.
      const message =
        error.name === "TypeError" || /network|fetch failed/i.test(error.message || "")
          ? "Network error — check your connection and try again"
          : error.message || "Could not fetch this page";
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // Only re-runs when `page` changes via goToPage below - not on every
    // render, and not for the aspect/crop state changes further down,
    // which have nothing to do with which page is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const goToPage = (next) => {
    if (busy) return;
    if (next < 1) return;
    if (totalPages && next > totalPages) return;
    setPage(next);
    setPageInput(String(next));
  };

  const handlePageInputSubmit = (event) => {
    event.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      goToPage(parsed);
    } else {
      setPageInput(String(page));
    }
  };

  function onImageLoad() {
    setImageLoaded(true);
    const full = { unit: "%", x: 0, y: 0, width: 100, height: 100 };
    setCrop(full);
    // Seed completedCrop so "Use This Crop" works without requiring the
    // user to nudge the crop box first (otherwise the button stays
    // disabled and nothing is uploaded).
    setCompletedCrop(full);
  }

  function handleAspectChange(nextAspect) {
    setAspectPreset(nextAspect);
    const img = imgRef.current;
    if (!img) return;
    if (nextAspect === undefined) {
      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
      return;
    }
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, nextAspect, img.width, img.height),
        img.width,
        img.height,
      ),
    );
  }

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleUseCrop = async () => {
    const img = imgRef.current;
    if (!completedCrop || !img) return;
    setCropError("");
    setIsPreparingCrop(true);
    try {
      // Percent crop → natural-image pixels (same as DiagramCropModal).
      const cropX = Math.round((completedCrop.x / 100) * img.naturalWidth);
      const cropY = Math.round((completedCrop.y / 100) * img.naturalHeight);
      const cropWidth = Math.max(
        1,
        Math.round((completedCrop.width / 100) * img.naturalWidth),
      );
      const cropHeight = Math.max(
        1,
        Math.round((completedCrop.height / 100) * img.naturalHeight),
      );

      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not process the cropped image");
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Could not process the cropped image"));
        }, "image/png");
      });

      const file = new File([blob], `page-${page}-crop.png`, {
        type: "image/png",
      });
      onCropped(file);
    } catch (error) {
      setCropError(error.message || "Could not prepare this crop");
    } finally {
      setIsPreparingCrop(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 backdrop-blur-xs sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500/15 text-orange-500">
              <FileImage className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Fetch Page from PDF
              </h2>
              <p className="text-xs text-muted-foreground">
                Pick a page, then crop the diagram out of it
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
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={busy || page <= 1}
              onClick={() => goToPage(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={pageInput}
                disabled={busy}
                onChange={(e) => setPageInput(e.target.value)}
                className="w-14 rounded-lg border border-border bg-card px-2 py-1.5 text-center text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <span className="text-xs text-muted-foreground">
                of {totalPages ?? "…"}
              </span>
            </form>
            <button
              type="button"
              disabled={busy || (totalPages != null && page >= totalPages)}
              onClick={() => goToPage(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex min-h-64 max-h-72 sm:max-h-96 w-full items-center justify-center overflow-hidden rounded-2xl bg-muted border border-border">
            {fetchError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-xs">
                <p className="font-bold text-red-500 mb-1">{fetchError}</p>
                <p className="text-muted-foreground mb-3 max-w-sm">
                  If this is the first request in a while, the page renderer
                  may need up to a minute to wake up - try again.
                </p>
                <button
                  type="button"
                  onClick={() => fetchPage(page)}
                  className="px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 font-bold text-orange-500 hover:bg-orange-500/20 transition-all"
                >
                  Retry
                </button>
              </div>
            ) : imageUrl ? (
              <ReactCrop
                crop={crop}
                aspect={aspectPreset}
                onChange={(_pixelCrop, percentCrop) => setCrop(percentCrop)}
                onComplete={(_pixelCrop, percentCrop) => setCompletedCrop(percentCrop)}
                className="max-h-72 sm:max-h-96"
              >
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  key={imageUrl}
                  ref={imgRef}
                  src={imageUrl}
                  onLoad={onImageLoad}
                  className={`max-h-72 sm:max-h-96 w-auto transition-opacity duration-200 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              </ReactCrop>
            ) : null}
            {isFetching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span>Fetching page {page}…</span>
                <span className="font-normal text-[11px]">
                  This can take up to a minute if the renderer was idle
                </span>
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

          {cropError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">
              {cropError}
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
            onClick={handleUseCrop}
            disabled={busy || !completedCrop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-xs sm:text-sm font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition-all disabled:opacity-50"
          >
            {isPreparingCrop && <Loader2 className="w-4 h-4 animate-spin" />}
            Use This Crop
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
