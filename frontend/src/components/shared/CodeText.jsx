import { useMemo } from "react";
import MathText from "./MathText";
import QuestionTable from "./QuestionTable";
import { splitIntoTextBlocks } from "@/utils/textBlocks";

const CODE_FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;

function renderProseSegment(segment, textClassName, keyPrefix) {
  if (!segment) return null;
  const blocks = splitIntoTextBlocks(segment);
  return blocks.flatMap((block, index) => {
    if (block.type === "table") {
      return (
      <QuestionTable
        key={`${keyPrefix}-tbl-${index}`}
        header={block.header}
        rows={block.rows}
      />
      );
    }

    const nodes = [];
    let proseLines = [];
    let proseIndex = 0;
    const flushProse = () => {
      if (proseLines.length === 0) return;
      nodes.push(
        <p
          key={`${keyPrefix}-p-${index}-${proseIndex}`}
          className={`whitespace-pre-wrap ${textClassName}`}
        >
          <MathText text={proseLines.join("\n")} />
        </p>,
      );
      proseLines = [];
      proseIndex += 1;
    };

    block.content.split("\n").forEach((line, lineIndex) => {
      const heading = line.match(/^((?:(?:\*\*|~~|\*|<u>)*))(#{1,3})\s+/);
      if (heading) {
        flushProse();
        const headingClassName = {
          1: "text-xl font-extrabold",
          2: "text-lg font-bold",
          3: "text-base font-bold",
        }[heading[2].length];
        const Tag = `h${heading[2].length}`;
        nodes.push(
          <Tag key={`${keyPrefix}-h-${index}-${lineIndex}`} className={`${headingClassName} text-foreground`}>
            <MathText text={`${heading[1]}${line.slice(heading[0].length)}`} />
          </Tag>
        );
        return;
      }

      proseLines.push(line);
    });
    flushProse();
    return nodes;
  });
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
