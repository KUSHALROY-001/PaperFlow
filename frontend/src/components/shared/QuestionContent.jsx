import { resolveAssetUrl } from "@/lib/api";
import CodeText from "./CodeText";

// Extracted so QuestionContent consumers can render it
// themselves after their own options block for placement === "below_options" -
// QuestionContent only ever renders inline (above or below the text), it
// never has access to the options list that comes after it.
export function QuestionDiagram({ diagramUrl, className = "" }) {
  if (!diagramUrl) return null;
  return (
    <img
      src={resolveAssetUrl(diagramUrl)}
      alt="Question diagram"
      className={`max-w-full rounded-xl border border-border ${className}`}
      loading="lazy"
    />
  );
}

// Extracted so QuestionContent consumers can render it after their options block.
export function QuestionExplanation({ explanation, className = "" }) {
  if (!explanation) return null;
  return (
    <div
      className={`rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3 sm:px-4 sm:py-3.5 mt-3 ${className}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
        Explanation
      </div>
      <div className="space-y-2">
        <CodeText text={explanation} textClassName="text-sm text-foreground" />
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
      {showAboveText && <QuestionDiagram diagramUrl={diagramUrl} />}
      {text && <CodeText text={text} textClassName={textClassName} />}
      {showBelowText && <QuestionDiagram diagramUrl={diagramUrl} />}
    </div>
  );
}

