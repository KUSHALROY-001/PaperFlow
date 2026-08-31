import CodeText from "./CodeText";

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
// Fenced segments in text/passage are parsed as code blocks; non-fenced
// segments pass through splitIntoTextBlocks + MathText, which resolves
// any ![[img:slot_key]] marker inline, wherever it sits in the text -
// that's the diagram's entire position now (see migration 041/042):
// there's no more separate diagramUrl/placement prop or top-level
// above/below rendering here.
export default function QuestionContent({
  text,
  passage,
  textClassName = "text-sm text-foreground",
  editable = false,
  onUpdateText,
}) {
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
      {text && (
        <CodeText
          text={text}
          textClassName={textClassName}
          editable={editable}
          onUpdateText={onUpdateText}
        />
      )}
    </div>
  );
}
