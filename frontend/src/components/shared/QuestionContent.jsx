import { resolveAssetUrl } from "@/lib/api";

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
export default function QuestionContent({
  text,
  hasCode = false,
  codeLanguage,
  diagramUrl,
  textClassName = "text-sm text-foreground",
}) {
  return (
    <div className="space-y-3">
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
        // whitespace-pre-wrap (not the default whitespace-normal every one
        // of these three used before) so a non-code question with its own
        // real line breaks - a passage-style question, a multi-line
        // "Consider the following statements" list - still reads correctly
        // too. This isn't code-specific; it's just not destroying newlines
        // that were never the code-formatting bug but were silently broken
        // the same way.
        <p className={`whitespace-pre-wrap ${textClassName}`}>{text}</p>
      )}
      {diagramUrl && (
        <img
          src={resolveAssetUrl(diagramUrl)}
          alt="Question diagram"
          className="max-w-full rounded-xl border border-border"
          loading="lazy"
        />
      )}
    </div>
  );
}
