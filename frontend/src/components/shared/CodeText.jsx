import { useMemo } from "react";
import MathText from "./MathText";
import QuestionTable from "./QuestionTable";
import { splitIntoTextBlocks } from "@/utils/textBlocks";

const CODE_FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;

function renderProseSegment(segment, textClassName, keyPrefix) {
  if (!segment) return null;
  const blocks = splitIntoTextBlocks(segment);
  return blocks.map((block, index) =>
    block.type === "table" ? (
      <QuestionTable
        key={`${keyPrefix}-tbl-${index}`}
        header={block.header}
        rows={block.rows}
      />
    ) : (
      <p
        key={`${keyPrefix}-p-${index}`}
        className={`whitespace-pre-wrap ${textClassName}`}
      >
        <MathText text={block.content} />
      </p>
    ),
  );
}

function buildNodes(text, textClassName) {
  if (!text) return null;
  const str = String(text);
  const parts = str.split(CODE_FENCE_RE);
  const nodes = [];
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i];
    if (prose) {
      nodes.push(renderProseSegment(prose, textClassName, `prose-${i}`));
    }
    if (i + 1 < parts.length) {
      const codeLanguage = parts[i + 1]?.trim() || null;
      const codeBody = parts[i + 2] ?? "";
      nodes.push(
        <div
          key={`code-${i}`}
          className="rounded-xl border border-border bg-muted/60 overflow-hidden my-3"
        >
          {codeLanguage && (
            <div className="px-3 py-1.5 border-b border-border bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {codeLanguage}
            </div>
          )}
          <pre
            className="overflow-x-auto p-3 sm:p-4 text-xs sm:text-sm leading-relaxed"
            style={{ tabSize: 4, MozTabSize: 4 }}
          >
            <code className="font-mono whitespace-pre">{codeBody}</code>
          </pre>
        </div>,
      );
    }
  }
  return nodes;
}

export default function CodeText({
  text,
  textClassName = "text-sm text-foreground",
}) {
  const nodes = useMemo(
    () => buildNodes(text, textClassName),
    [text, textClassName],
  );
  return <>{nodes}</>;
}
