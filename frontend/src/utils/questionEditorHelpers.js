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

export function toEditorQuestion(question) {
  const options = question.options?.map((option) => option.optionText) || [];
  return {
    id: question.id,
    persisted: true,
    questionNo: question.question_no,
    text: question.question_text,
    options,
    correctOptionIndexes: question.correct_option_indexes || [0],
    topic: question.topic || "General",
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
    // placement/source: Part C (manual image insert). placement always
    // has a value (attachDiagramUrls sets it whenever ANY asset exists,
    // defaulting "below_text" at the DB column level - see migration
    // 015), but fall back here too in case a question has no asset at all
    // and the key is simply absent. source only ever arrives via
    // attachDiagramOriginalUrls (editor-only), so it's undefined whenever
    // diagramOriginalUrl is - DiagramUploadControl's replace-confirm copy
    // treats that the same as "extracted" (nothing to distinguish yet).
    placement: question.placement || "below_text",
    source: question.source,
    // Same story as diagramUrl above, for the code-formatting fields -
    // findQuestionById is a plain `SELECT *`, so has_code/code_language
    // are already on the raw row; this is the only place that would
    // otherwise silently drop them before QuestionForm.jsx's preview ever
    // sees them.
    hasCode: question.has_code || false,
    codeLanguage: question.code_language || null,
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
  return kind === "latex" || (kind === "symbol" && (token === "^" || token === "_"));
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
    .map((segment, index) => (index % 2 === 1 ? segment : wrapPlainSegment(segment)))
    .join("");
}
