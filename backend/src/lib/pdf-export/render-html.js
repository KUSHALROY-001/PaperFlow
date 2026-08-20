import { escapeHtml, renderTextWithMath } from "./math-html.js";
import { renderQuestionTextHtml } from "./table-html.js";

// The `questions` array this module receives comes straight from
// mock-tests.service.js#listQuestions, which is a plain `SELECT q.*` (see
// mock-tests.repository.js#listQuestionsWithOptions) - so most fields are
// still the raw snake_case DB columns (question_text, question_no,
// correct_option_indexes, has_code, code_language), NOT the camelCase
// shape the rest of this file expects. Mirrors frontend's
// utils/mockTestHelpers.js#mapQuestion, which normalizes the exact same
// raw row for OutputTab/ReviewTab - diagramUrl and placement are the two
// exceptions, already camelCase because attachDiagramUrls
// (question-assets.service.js) sets them directly in JS rather than
// pulling them off a SQL row.
function normalizeQuestion(question) {
  return {
    ...question,
    text: question.question_text,
    questionNo: question.question_no,
    correctOptionIndexes: question.correct_option_indexes,
  };
}

// Mirrors QuestionContent.jsx's placement rule exactly: "above_text"
// renders before the question body, "below_text" (default) renders
// after it but before options, "below_options" renders after the
// options grid. Keeping this logic in one place (rather than three
// separate if-blocks scattered through the template below) is what
// makes it easy to confirm it actually matches the frontend's rule.
function diagramHtml(question, { baseUrl }) {
  if (!question.diagramUrl) return "";
  // diagramUrl from attachDiagramUrls is a backend-relative path (see
  // frontend's resolveAssetUrl) - Puppeteer is a separate browser process
  // making a real HTTP request for this <img>, so it needs an absolute
  // URL it can actually reach, not a path relative to nothing.
  const src = `${baseUrl}${question.diagramUrl}`;
  return `<img class="diagram" src="${escapeHtml(src)}" alt="Question diagram" />`;
}

const CODE_FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;

function renderQuestionTextWithCodeHtml(text) {
  if (!text) return "";
  const str = String(text);
  const parts = str.split(CODE_FENCE_RE);
  let html = "";
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i];
    if (prose) {
      html += renderQuestionTextHtml(prose);
    }
    if (i + 1 < parts.length) {
      const codeLanguage = parts[i + 1]?.trim() || null;
      const codeBody = parts[i + 2] ?? "";
      html += `
        <div class="code-block">
          ${codeLanguage ? `<div class="code-lang">${escapeHtml(codeLanguage)}</div>` : ""}
          <pre style="tab-size:4;-moz-tab-size:4;white-space:pre-wrap;"><code>${escapeHtml(codeBody)}</code></pre>
        </div>
      `;
    }
  }
  return html;
}

function questionBodyHtml(question) {
  return renderQuestionTextWithCodeHtml(question.text);
}

function optionsHtml(question) {
  // Don't mark correct options inline; the answer key at the end will show answers.
  return `
    <div class="options">
      ${question.options
        .map((option, index) => {
          // Deliberately built as ONE line with no newlines/indentation
          // between the tags - white-space: pre-wrap on .option-text
          // (see CSS) makes literal whitespace significant, and this
          // function's own multi-line template-literal formatting would
          // otherwise become part of the rendered output (that's exactly
          // what put "A." on its own line, then the option text indented
          // below it, the first time pre-wrap was added here). The
          // pre-wrap now lives on .option-text specifically, not the
          // parent .option div, so only the option's actual content -
          // never this function's own formatting - is what gets
          // preserved.
          return `<div class="option"><span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${renderTextWithMath(option.optionText)}</span></div>`;
        })
        .join("")}
    </div>
  `;
}

function answerKeyHtml(questions) {
  return `
    <section class="answer-key">
      <h2>Answer Key</h2>
      <ol class="answer-list">
        ${questions
          .map((q, index) => {
            const letters = (q.correctOptionIndexes || [])
              .map((i) => String.fromCharCode(65 + i))
              .join(", ");
            const display = letters || "—";
            return `<li><span class="ak-qno">Q${q.questionNo ?? index + 1}.</span> <span class="ak-answers">${escapeHtml(display)}</span></li>`;
          })
          .join("")}
      </ol>
    </section>
  `;
}

function explanationHtml(question) {
  if (!question.explanation) return "";
  return `
    <div class="explanation-box" style="margin-top: 10px; padding: 8px 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px;">
      <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; margin-bottom: 4px;">Explanation</div>
      <div>${renderQuestionTextWithCodeHtml(question.explanation)}</div>
    </div>
  `;
}

function questionHtml(question, index, { baseUrl }) {
  const placement = question.placement || "below_text";
  const diagram = diagramHtml(question, { baseUrl });

  return `
    <section class="question">
      <div class="question-header">
        <span class="question-no">Q${question.questionNo ?? index + 1}</span>
        ${question.topic ? `<span class="question-topic">${escapeHtml(question.topic)}</span>` : ""}
      </div>
      ${placement === "above_text" ? diagram : ""}
      ${questionBodyHtml(question)}
      ${placement === "below_text" ? diagram : ""}
      ${optionsHtml(question)}
      ${placement === "below_options" ? diagram : ""}
      ${explanationHtml(question)}
    </section>
  `;
}

// katex.min.css is served statically at this path (see app.js) rather
// than inlined - its rules reference font files by relative url(...), and
// an inlined <style> block has no base URL for those to resolve against
// when Puppeteer loads the page via page.setContent() (which, unlike
// page.goto(), has no navigable URL of its own to resolve relative paths
// from). An absolute <link href> sidesteps that entirely.
export function renderMockTestHtml({ mockTest, questions, baseUrl }) {
  const katexCssUrl = `${baseUrl}/static/katex/katex.min.css`;
  // mockTest here is a raw `SELECT mt.*` row (see
  // mock-tests.repository.js#findMockTestById) - the DB column is `name`,
  // not `title`, so this was always falling back to the generic default
  // below on every export.
  const titleText = mockTest.name || "Mock Test";
  const normalizedQuestions = questions.map((q) => normalizeQuestion(q));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titleText)}</title>
<link rel="stylesheet" href="${katexCssUrl}" />
<style>
  @page { size: A4; margin: 20mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.5;
  }
  .cover {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #1a1a1a;
  }
  .cover h1 { font-size: 20pt; margin: 0 0 4px; }
  .cover .meta { font-size: 10pt; color: #555; }
  .question {
    margin-bottom: 20px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .question-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .question-no {
    font-weight: 700;
    color: #ea580c;
    background: #fff2e8;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 9pt;
  }
  .question-topic {
    font-size: 9pt;
    color: #555;
    background: #f2f2f2;
    border-radius: 6px;
    padding: 2px 8px;
  }
  .question-text {
    font-weight: 600;
    margin: 0 0 10px;
    white-space: pre-wrap;
  }
  .q-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 10px;
    font-size: 9.5pt;
    font-weight: 400;
    /* A List-I/List-II table is short enough to always fit on one page in
       practice; avoiding a split here matters more than the (rare) case
       of a table taller than a full page, which will still split despite
       this - same trade-off as .question's break-inside: avoid above. */
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .q-table th, .q-table td {
    border: 1px solid #ddd;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  .q-table th {
    background: #f7f7f7;
    font-weight: 700;
  }
  .q-table tbody tr:nth-child(even) { background: #fafafa; }
  .diagram {
    display: block;
    max-width: 100%;
    max-height: 260px;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  .code-block {
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f7f7f7;
    margin: 0 0 10px;
    overflow: hidden;
  }
  .code-lang {
    font-size: 8pt;
    text-transform: uppercase;
    font-weight: 700;
    color: #777;
    padding: 4px 10px;
    border-bottom: 1px solid #ddd;
  }
  .code-block pre {
    margin: 0;
    padding: 10px;
    font-family: "SF Mono", Consolas, monospace;
    font-size: 9pt;
    /* Also set inline on the <pre> tag itself in
       renderQuestionTextWithCodeHtml() above, deliberately matching this
       value - inline style always wins over a class rule on specificity,
       so if the two ever disagree, THIS declaration is the one that's
       silently dead. (That's exactly what happened before: the inline
       style used to say white-space:pre, so long code lines could never
       wrap and got cut off in exported PDFs, which - unlike a browser
       tab - can't scroll horizontally.) Change both together. */
    white-space: pre-wrap;
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .option {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 10pt;
  }
  .option-text {
    /* Mirrors OutputTab.jsx's whitespace-pre-wrap on the same option div -
       without this, Chrome's default white-space: normal collapses any
       real "\n" in optionText down to a single line. Scoped to this span
       specifically (not .option) - see optionsHtml()'s comment for why
       putting it on the parent div broke the letter/text layout instead. */
    white-space: pre-wrap;
  }
  .option-letter { font-weight: 700; margin-right: 6px; }
  .math-display { display: block; margin: 6px 0; }
  .katex { font-size: 1.05em; }

  /* Answer key styles */
  .answer-key { page-break-before: always; margin-top: 10px; }
  .answer-key h2 { font-size: 16pt; margin: 0 0 8px; }
  .answer-list { list-style: none; padding: 0; margin: 0; columns: 2; gap: 12px; }
  .answer-list li { margin: 4px 0; }
  .ak-qno { font-weight: 700; margin-right: 6px; }
  .ak-answers { color: #0b6; font-weight: 600; }
</style>
</head>
<body data-mocktest-title="${escapeHtml(titleText)}">
  <div class="cover">
    <h1>${escapeHtml(titleText)}</h1>
    <div class="meta">${normalizedQuestions.length} question${normalizedQuestions.length === 1 ? "" : "s"} &middot; generated ${new Date().toLocaleDateString()}</div>
  </div>
  ${normalizedQuestions.map((question, index) => questionHtml(question, index, { baseUrl })).join("")}
  ${answerKeyHtml(normalizedQuestions)}
</body>
</html>`;
}
