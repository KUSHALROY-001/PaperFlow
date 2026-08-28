import { useState, useEffect } from "react";
import {
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { resolveAssetUrl } from "@/lib/api";
import CodeText from "./CodeText";

// Extracted so QuestionContent consumers can render it
// themselves after their own options block for placement === "below_options" -
// QuestionContent only ever renders inline (above or below the text), it
// never has access to the options list that comes after it.
export function QuestionDiagram({ diagramUrl, className = "" }) {
  const [status, setStatus] = useState("loading"); // "loading" | "loaded" | "error"
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setStatus("loading");
    setRetryCount(0);
  }, [diagramUrl]);

  if (!diagramUrl) return null;

  const rawUrl = resolveAssetUrl(diagramUrl);
  // Cache buster for manual retries. Replace/crop already change
  // diagramUrl itself (backend attaches ?v=<created_at>), so a new
  // image does not depend on this - only the Retry button does.
  const imageUrl =
    retryCount > 0
      ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}_r=${retryCount}`
      : rawUrl;

  const handleRetry = () => {
    setStatus("loading");
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div className={`relative max-w-full my-2 ${className}`}>
      {status === "loading" && (
        <div className="flex h-36 w-full max-w-md items-center justify-center rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs font-semibold text-muted-foreground animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>Loading diagram...</span>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-foreground max-w-lg shadow-xs transition-all">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Diagram image could not be loaded</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The cloud image could not be retrieved from Cloudinary storage. The
            link might be expired, cloud storage unconfigured, or blocked by
            network restrictions.
          </p>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 transition-all"
            >
              <RotateCcw className="h-3 w-3" />
              Retry Loading
            </button>
            <a
              href={rawUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Open Image Link
            </a>
          </div>
        </div>
      )}

      <img
        key={imageUrl}
        src={imageUrl}
        alt="Question diagram"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        // Deliberately never `display:none` (Tailwind `hidden`) while
        // loading - native `loading="lazy"` decides whether to even
        // START fetching an image based on its layout box via
        // IntersectionObserver, and `display:none` elements have no box
        // at all. That combination silently never fetches the image (no
        // request, no error, stuck on the loading placeholder forever)
        // rather than failing loudly - see the bug report this fixes.
        // `opacity-0` + `absolute` keeps a real, measurable box (so lazy
        // loading can still trigger) while staying invisible and out of
        // flow so it doesn't add extra space next to the loading
        // placeholder above.
        className={`max-w-full rounded-xl border border-border transition-opacity duration-300 ${
          status === "loaded"
            ? "relative opacity-100"
            : "absolute inset-0 opacity-0 pointer-events-none"
        }`}
        loading="lazy"
      />
    </div>
  );
}

// Extracted so QuestionContent consumers can render it after their options block.
export function QuestionExplanation({
  explanation,
  className = "",
  editable = false,
  onUpdateExplanation,
}) {
  if (!explanation) return null;
  return (
    <div
      className={`rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3 sm:px-4 sm:py-3.5 mt-3 ${className}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
        Explanation
      </div>
      <div className="space-y-2">
        <CodeText
          text={explanation}
          textClassName="text-sm text-foreground"
          editable={editable}
          onUpdateText={onUpdateExplanation}
        />
      </div>
    </div>
  );
}

// Every render path (passage, text) passes through CodeText unconditionally.
// Fenced segments in text/passage are parsed as code blocks;
// non-fenced segments pass through splitIntoTextBlocks + MathText.
export default function QuestionContent({
  text,
  passage,
  diagramUrl,
  placement = "below_text",
  textClassName = "text-sm text-foreground",
  editable = false,
  onUpdateText,
}) {
  const showAboveText = diagramUrl && placement === "above_text";
  const showBelowText =
    diagramUrl && placement !== "above_text" && placement !== "below_options";

  return (
    <div className="space-y-3">
      {passage && (
        <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 sm:px-4 sm:py-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Passage
          </div>
          <div className="space-y-2">
            <CodeText
              text={passage}
              textClassName="text-sm text-muted-foreground"
            />
          </div>
        </div>
      )}
      {showAboveText && (
        <QuestionDiagram key={diagramUrl} diagramUrl={diagramUrl} />
      )}
      {text && (
        <CodeText
          text={text}
          textClassName={textClassName}
          editable={editable}
          onUpdateText={onUpdateText}
        />
      )}
      {showBelowText && (
        <QuestionDiagram key={diagramUrl} diagramUrl={diagramUrl} />
      )}
    </div>
  );
}
