import { useMemo } from "react";
import { resolveAssetUrl } from "@/lib/api";
import MathText from "./MathText";
import QuestionTable from "./QuestionTable";
import { splitIntoTextBlocks } from "@/utils/textBlocks";

// Extracted so the 6 QuestionContent consumers (see below) can render it
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

// Shared by QuestionForm.jsx (editor Live Preview), OutputTab.jsx (Visual
// view) and ReviewTab.jsx. Before this, all three had their own ad-hoc
// rendering: QuestionForm was the only one that showed diagramUrl at all
// (OutputTab/ReviewTab never rendered an <img> for it, despite the API
// already returning it - see mapQuestion in mockTestHelpers.js, which
// dropped diagramUrl/hasCode/codeLanguage entirely even though the raw API
// row has them), and none of the three preserved multi-line formatting -
// question.text was rendered in a bare <h3>/<p>, and HTML collapses
// whitespace by default, so even a plain multi-line question read as one
// run-on line regardless of what worker/question_parser.py's Phase 1 fix
// now preserves in the database.
//
// hasCode/codeLanguage come from worker/ai/schemas.py's extraction
// (persisted on `questions` - see migration 012, surfaced through
// mock-tests.repository.js#listQuestionsWithOptions as plain has_code/
// code_language columns since that endpoint is a bare `SELECT q.*`). A
// question flagged has_code gets a real <pre><code> block instead of prose
// styling - collapsing indentation/newlines in a code snippet is exactly
// the bug Phase 1 fixed at the extraction layer; rendering it back into a
// plain paragraph here would undo that fix visually even with the data
// intact.
//
// Ships the "minimal" version from the plan: monospace font + preserved
// whitespace only, no syntax coloring. codeLanguage is still shown as a
// label on the code block even without highlighting, and stays available
// on the question object for a highlighter to pick up later without
// another data-plumbing pass.
//
// Non-code text runs through splitIntoTextBlocks (see utils/textBlocks.js)
// before MathText - a question that embeds a GitHub-Flavored-Markdown
// table (worker/ai/provider.py's SYSTEM_PROMPT now instructs the model to
// emit one for a List-I/List-II or data table, instead of flattening it
// into a bulleted paragraph that loses the original grid layout entirely)
// renders as a real <table> via QuestionTable, interleaved with ordinary
// <p> blocks for the surrounding prose. Text with no table in it produces
// exactly one prose block - identical output to the old single-<p>
// rendering, so this is safe as the unconditional default.
//
// Deliberately NOT applied inside the hasCode branch below - a code
// snippet's `$` or backslashes are code syntax, not math delimiters, and
// running them through MathText (or table-splitting, for that matter -
// ASCII art / a formatted table IN code is still code) would misinterpret
// them.
//
// placement (Part C - see migration 015): "above_text" renders the
// diagram before the text, "below_text" (the default, and the only
// position that ever existed before this) renders it after - both handled
// inline here. "below_options" renders NOTHING here; the consumer renders
// <QuestionDiagram> itself after its own options block instead, since this
// component has no visibility into what comes after it.
export default function QuestionContent({
  text,
  hasCode = false,
  codeLanguage,
  diagramUrl,
  placement = "below_text",
  textClassName = "text-sm text-foreground",
}) {
  const showAboveText = diagramUrl && placement === "above_text";
  const showBelowText =
    diagramUrl && placement !== "above_text" && placement !== "below_options";
  const blocks = useMemo(
    () => (hasCode ? null : splitIntoTextBlocks(text)),
    [text, hasCode],
  );

  return (
    <div className="space-y-3">
      {showAboveText && <QuestionDiagram diagramUrl={diagramUrl} />}
      {hasCode ? (
        <div className="rounded-xl border border-border bg-muted/60 overflow-hidden">
          {codeLanguage && (
            <div className="px-3 py-1.5 border-b border-border bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {codeLanguage}
            </div>
          )}
          <pre className="overflow-x-auto p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
            <code className="font-mono whitespace-pre">{text}</code>
          </pre>
        </div>
      ) : (
        blocks.map((block, index) =>
          block.type === "table" ? (
            <QuestionTable
              key={index}
              header={block.header}
              rows={block.rows}
            />
          ) : (
            // whitespace-pre-wrap (not the default whitespace-normal every
            // one of these three used before) so a non-code question with
            // its own real line breaks - a passage-style question, a
            // multi-line "Consider the following statements" list - still
            // reads correctly too. This isn't code-specific; it's just not
            // destroying newlines that were never the code-formatting bug
            // but were silently broken the same way.
            <p key={index} className={`whitespace-pre-wrap ${textClassName}`}>
              <MathText text={block.content} />
            </p>
          ),
        )
      )}
      {showBelowText && <QuestionDiagram diagramUrl={diagramUrl} />}
    </div>
  );
}
