export const topicCategories = [
  "Data Structures",
  "Algorithms",
  "Networking",
  "OOP",
  "Computer Architecture",
  "Databases",
  "Java",
  "OS",
  "C Programming",
  "Discrete Mathematics",
  "Operating Systems",
  "Software Engineering",
  "Digital Logic",
  "Compiler Design",
  "General",
];

function normalizeOptionText(option) {
  return typeof option === "string" ? option : option?.optionText || "";
}

export function toEditorQuestion(question) {
  const options = question.options?.map(normalizeOptionText) || [];
  return {
    id: question.id,
    persisted: true,
    questionNo: question.question_no,
    text: question.question_text,
    options,
    correctOptionIndexes: question.correct_option_indexes || [0],
    topic: question.topic || "General",
    // Powers the "fetch this page from the original PDF" feature's
    // default page number (PdfPageFetchModal) - independent of whether
    // a diagram was ever detected for this question.
    sourcePage: question.source_page ?? null,
    // findQuestionById is a plain `SELECT *`, so subtopic/passage/
    // explanation are already on the raw row same as has_code/
    // code_language below - carried through here so the editor's Live
    // Preview (QuestionForm.jsx) can actually show them.
    subtopic: question.subtopic || "",
    passage: question.passage || "",
    explanation: question.explanation || "",
    questionType: question.question_type || "single",
    // The API attaches this (see backend attachDiagramUrls /
    // question-assets.service.js) whenever question_assets has a saved
    // diagram for this question - without carrying it through here it
    // silently never reaches QuestionForm.jsx's `{selected.diagramUrl &&
    // <img .../>}` check, even though the API response has it.
    diagramUrl: question.diagramUrl,
    // Set by attachDiagramOriginalUrls (mock-tests.service.js#listQuestions
    // only - the exam-play/shared-attempt question shapes never carry
    // these) whenever the asset has an original_storage_path to crop
    // against. Absent (undefined) for a diagram extracted before migration
    // 014 - DiagramCropModal's "Edit Crop" button in QuestionForm.jsx is
    // disabled on exactly that absence, not on hasManualCrop.
    diagramOriginalUrl: question.diagramOriginalUrl,
    hasManualCrop: question.hasManualCrop || false,
    // source: Part C (manual image insert), only ever arrives via
    // attachDiagramOriginalUrls (editor-only), so it's undefined whenever
    // diagramOriginalUrl is - DiagramUploadControl's replace-confirm copy
    // treats that the same as "extracted" (nothing to distinguish yet).
    // Position is no longer a stored field at all - a slot's image
    // renders wherever its own ![[img:slot]] marker sits in the
    // question's text/options/explanation (see migration 041/042, which
    // backfilled that marker and dropped the old placement column).
    source: question.source,
    // Multi-image slots (migration 040). attachDiagramUrls puts every
    // slot on the raw API row as diagramAssets; MathText resolves
    // ![[img:slot]] from this via DiagramAssetsProvider. Dropping it
    // here is why the editor showed "Missing image" even when Cloudinary
    // and question_assets already had the files.
    diagramAssets: question.diagramAssets || [],
    diagramSourceBySlot: question.diagramSourceBySlot || {},
    // Per-question scoring (nullable = fall back to mock-test defaults
    // at attempt scoring time). API/listQuestions returns snake_case from
    // the questions view; create/update paths may already be camelCase.
    marksPerCorrect:
      question.marksPerCorrect ?? question.marks_per_correct ?? null,
    negativeMarksPerWrong:
      question.negativeMarksPerWrong ??
      question.negative_marks_per_wrong ??
      null,
  };
}

export function getIssues(q) {
  let issues = 0;
  if (!q.text.trim()) issues++;
  if (q.options.length < 2) issues++;
  if (q.options.some((o) => !o.trim())) issues++;
  if (!q.correctOptionIndexes.length) issues++;
  return issues;
}

// --- Bare-LaTeX paste normalizer -------------------------------------
//
// worker/ai/provider.py's SYSTEM_PROMPT teaches the extraction pipeline to
// always wrap math in $...$/$$...$$ delimiters, so anything that comes
// through OCR/AI already renders correctly via MathText.jsx. This handles
// the OTHER input path: a human pasting an answer key or question bank
// straight into QuestionForm.jsx's text/option fields, where the LaTeX
// commands are present but nobody added delimiters around them (e.g.
// "\frac{49}{7}" sitting bare in the middle of a sentence) - MathText
// would otherwise print that literally, backslash and all.
//
// This is a best-effort heuristic, not a parser - it cannot always tell
// where a math expression ends and prose resumes (differential notation
// like "dx", or a plain-English math word used outside a formula, can
// still slip past it in either direction). It's wired to the "Clean up
// pasted math" button in QuestionForm.jsx specifically so a human reviews
// the Live Preview (which already renders via MathText) before saving,
// rather than being run automatically on every keystroke or save.

// Bare (non-backslash) function/operator names that commonly appear in
// pasted math without a leading "\" - e.g. someone typed "log_e x" instead
// of "\log_e x". Treated as math-safe so they don't break a run the way an
// ordinary English word would, but NOT treated as anchors on their own -
// "the analog signal" should never get wrapped just because "signal" isn't
// in this list and "analog" isn't either (whole-token match only).
const MATH_FUNCTION_WORDS = new Set([
  "log",
  "ln",
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "lim",
  "max",
  "min",
  "exp",
  "mod",
  "gcd",
  "lcm",
  "det",
  "dx",
  "dy",
  "dz",
  "dt",
  "du",
  "dv",
]);

// Same delimiter set MathText.jsx recognizes - anything already wrapped is
// left untouched rather than re-wrapped or double-escaped.
const ALREADY_DELIMITED_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))/g;

// Tokenizes into: a LaTeX command (\frac, \left, \pi, ...), a run of
// digits, a run of 2+ letters (a plain word, unless it's in
// MATH_FUNCTION_WORDS), a single letter (a possible math variable, e.g.
// the "x" in "x^2"), a whitespace run, or any other single character
// (operators, braces, punctuation).
const TOKEN_RE = /\\[a-zA-Z]+|[0-9]+|[a-zA-Z]{2,}|[a-zA-Z]|\s+|./g;

function classifyToken(token) {
  if (/^\\[a-zA-Z]+$/.test(token)) return "latex";
  if (/^[0-9]+$/.test(token)) return "number";
  if (/^\s+$/.test(token)) return "space";
  if (/^[a-zA-Z]{2,}$/.test(token)) {
    return MATH_FUNCTION_WORDS.has(token.toLowerCase()) ? "mathword" : "word";
  }
  if (/^[a-zA-Z]$/.test(token)) return "letter";
  return "symbol"; // operators, braces, punctuation
}

function isAnchor(token, kind) {
  // A backslash command is unambiguous. A bare "^" or "_" is too - plain
  // English essentially never uses either character, so their presence is
  // as strong a signal that this run is math as an actual LaTeX command.
  return (
    kind === "latex" || (kind === "symbol" && (token === "^" || token === "_"))
  );
}

function wrapPlainSegment(segment) {
  const tokens = segment.match(TOKEN_RE) || [];
  const kinds = tokens.map(classifyToken);

  let output = "";
  let i = 0;

  while (i < tokens.length) {
    if (kinds[i] === "word") {
      output += tokens[i];
      i++;
      continue;
    }

    // A blank-line whitespace token never starts a math run (a formula
    // should never span a paragraph break, same reasoning as the
    // run-growing loop's own stop condition below) - emit it as-is and
    // advance, exactly like the "word" branch above. Without this check,
    // whenever tokens[i] IS a blank-line token, the run-growing loop's
    // guard is already false on its very first iteration (end === i), so
    // it executes zero times - runTokens ends up empty, nothing gets
    // appended, and `i = end` sets i to itself. The outer while loop then
    // never advances again and spins forever at 100% CPU - this is the
    // exact freeze/"Page Unresponsive" bug, and it fires on ANY
    // multi-paragraph input (a blank line between a question stem and its
    // explanation, a passage and its question, etc.), not an edge case.
    if (kinds[i] === "space" && /\n\s*\n/.test(tokens[i])) {
      output += tokens[i];
      i++;
      continue;
    }

    // Grow a maximal run of non-word tokens - numbers, symbols, letters,
    // math-function words, latex commands, and whitespace - stopping at
    // the next real word or a blank line, since a math expression should
    // never span a paragraph break.
    let end = i;
    while (
      end < tokens.length &&
      kinds[end] !== "word" &&
      !(kinds[end] === "space" && /\n\s*\n/.test(tokens[end]))
    ) {
      end++;
    }

    const runTokens = tokens.slice(i, end);
    const runKinds = kinds.slice(i, end);
    const hasAnchor = runTokens.some((t, idx) => isAnchor(t, runKinds[idx]));

    // Trim leading/trailing whitespace out of the delimiters so a wrap
    // reads "text $\frac{1}{2}$ text", not "text $ \frac{1}{2} $text".
    let trimStart = 0;
    let trimEnd = runTokens.length;
    while (trimStart < trimEnd && runKinds[trimStart] === "space") trimStart++;
    while (trimEnd > trimStart && runKinds[trimEnd - 1] === "space") trimEnd--;

    const leading = runTokens.slice(0, trimStart).join("");
    const trailing = runTokens.slice(trimEnd).join("");
    const core = runTokens.slice(trimStart, trimEnd).join("");

    if (hasAnchor && core) {
      output += `${leading}$${core}$${trailing}`;
    } else {
      output += runTokens.join("");
    }

    i = end;
  }

  return output;
}

export function wrapBareLatex(text) {
  if (!text) return text;

  // Split out anything already inside math delimiters first - split() with
  // a single capturing group interleaves [plain, math, plain, math, ...],
  // so matches land on odd indices (same trick MathText.jsx uses to render
  // them). Only the plain segments get scanned for bare LaTeX to wrap.
  return String(text)
    .split(ALREADY_DELIMITED_RE)
    .map((segment, index) =>
      index % 2 === 1 ? segment : wrapPlainSegment(segment),
    )
    .join("");
}

// --- Shared textarea keyboard shortcuts -------------------------------
//
// Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic), Tab/Shift+Tab (indent/dedent).
// Extracted from QuestionForm.jsx's old per-field handler so the same
// behavior works both on its top-level Question Text/Explanation
// textareas AND on FormattedTextEditor.jsx's per-segment textareas
// (Formatted view) without duplicating this logic in two places. Takes
// the current string value and a setter rather than reaching into
// `updateSelected` directly, since a segment's raw text isn't a field on
// `selected` - it's a slice the caller owns.
export function handleRichTextareaKeyDown(e, value, onChange) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    wrapSelection(e.target, value, onChange, "**");
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
    e.preventDefault();
    wrapSelection(e.target, value, onChange, "*");
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    indentSelection(e.target, value, onChange, e.shiftKey);
  }
}

function wrapSelection(target, value, onChange, marker) {
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const selectedText = value.slice(start, end) || "text";
  const next = `${value.slice(0, start)}${marker}${selectedText}${marker}${value.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() =>
    target.setSelectionRange(
      start + marker.length,
      start + marker.length + selectedText.length,
    ),
  );
}

function indentSelection(target, value, onChange, dedent) {
  const start = target.selectionStart;
  const end = target.selectionEnd;

  if (start === end) {
    if (dedent) {
      // Dedent the line the cursor is on - no selection required, same
      // gesture a standard code editor supports.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = value.indexOf("\n", start);
      if (lineEnd === -1) lineEnd = value.length;
      const line = value.slice(lineStart, lineEnd);
      const match = line.match(/^ {1,4}/);
      const removed = match ? match[0].length : 0;

      if (removed > 0) {
        const newLine = line.slice(removed);
        const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        onChange(next);
        const newCursor = Math.max(lineStart, start - removed);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = newCursor;
        });
      }
      return;
    }

    const next = value.slice(0, start) + "    " + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 4;
    });
    return;
  }

  const selectedText = value.slice(start, end);
  const lines = selectedText.split("\n");
  const newLines = dedent
    ? lines.map((line) => line.replace(/^ {1,4}/, ""))
    : lines.map((line) => "    " + line);
  const replacement = newLines.join("\n");
  const next = value.slice(0, start) + replacement + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    target.selectionStart = start;
    target.selectionEnd = start + replacement.length;
  });
}
