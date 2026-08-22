// One-off backfill for Phase 5 of the math-formatting fix (see
// frontend/src/utils/questionEditorHelpers.js#wrapBareLatex and
// frontend/src/components/shared/MathText.jsx for the paste-time and
// render-time halves of this same fix).
//
// Any question saved BEFORE that fix existed may have bare LaTeX sitting
// in question_text/option_text/explanation with no $...$ delimiters around
// it (exactly the shape of the OCR'd/pasted text that motivated this fix -
// e.g. "\frac{49}{7}" typed straight into the page with no delimiters).
// MathText.jsx will print that literally, backslash and all, until the
// text itself is corrected. This script re-runs the same wrapBareLatex
// heuristic used by the editor's "Clean up pasted math" button, but over
// every row already in the database, in bulk.
//
// wrapBareLatex here is a deliberate COPY of
// frontend/src/utils/questionEditorHelpers.js#wrapBareLatex, not an
// import - the frontend and backend are two separate npm packages with no
// shared-code path between them (no monorepo workspace linking them), so
// duplicating the ~80 lines of pure logic is simpler than wiring up cross-
// package tooling for one script. If you change the heuristic in one
// place, change it in the other - grep both for "MATH_FUNCTION_WORDS" to
// find both copies.
//
// SAFETY: this is a heuristic, not a parser (see the long comment on
// wrapBareLatex below for what it can get wrong - differential notation
// like "dx", bare math words used outside a formula, etc). Never write
// silently:
//   - Default mode is DRY RUN: prints every row it WOULD change and exits
//     without touching the database.
//   - `--apply` actually writes the changes, inside one transaction.
//   - Every row it touches gets its question status set back to
//     'needs_review' (regardless of prior status) so a human re-confirms
//     it in ReviewTab before it ships again - an approved question that
//     silently changes shape is worse than one that briefly waits for
//     re-approval.
//   - `--limit N` caps how many question rows are considered, for
//     spot-checking on a subset before running the full table.
//
// Usage:
//   node src/db/backfill-math-formatting.js                # dry run, all rows
//   node src/db/backfill-math-formatting.js --limit 20      # dry run, first 20
//   node src/db/backfill-math-formatting.js --apply         # actually writes
//   npm run db:backfill-math -- --apply                     # via package.json script

import { pool } from "./pool.js";

// --- wrapBareLatex (copy - see file header) ---------------------------

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

const ALREADY_DELIMITED_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))/g;

const TOKEN_RE = /\\[a-zA-Z]+|[0-9]+|[a-zA-Z]{2,}|[a-zA-Z]|\s+|./g;

function classifyToken(token) {
  if (/^\\[a-zA-Z]+$/.test(token)) return "latex";
  if (/^[0-9]+$/.test(token)) return "number";
  if (/^\s+$/.test(token)) return "space";
  if (/^[a-zA-Z]{2,}$/.test(token)) {
    return MATH_FUNCTION_WORDS.has(token.toLowerCase()) ? "mathword" : "word";
  }
  if (/^[a-zA-Z]$/.test(token)) return "letter";
  return "symbol";
}

function isAnchor(token, kind) {
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

    // A blank-line whitespace token never starts a math run - emit it
    // as-is and advance, same as the "word" branch above. Without this,
    // whenever tokens[i] IS a blank-line token, the run-growing loop
    // below never executes even once (its own guard is already false at
    // end === i), leaving i unchanged forever - an infinite loop that
    // would hang this entire backfill script on the first question whose
    // text has a paragraph break (a passage followed by its question, an
    // explanation on its own paragraph, etc. - the normal case, not an
    // edge case). See frontend/src/utils/questionEditorHelpers.js's
    // identical fix for the full trace of how this froze the editor UI.
    if (kinds[i] === "space" && /\n\s*\n/.test(tokens[i])) {
      output += tokens[i];
      i++;
      continue;
    }

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

function wrapBareLatex(text) {
  if (!text) return text;
  return String(text)
    .split(ALREADY_DELIMITED_RE)
    .map((segment, index) =>
      index % 2 === 1 ? segment : wrapPlainSegment(segment),
    )
    .join("");
}

// --- backfill driver ----------------------------------------------------

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const limitFlagIndex = argv.indexOf("--limit");
  const limit =
    limitFlagIndex !== -1 && argv[limitFlagIndex + 1]
      ? Number.parseInt(argv[limitFlagIndex + 1], 10)
      : null;
  return { apply, limit: Number.isFinite(limit) ? limit : null };
}

function truncate(value, max = 80) {
  if (value == null) return value;
  const s = String(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function loadQuestions(client, limit) {
  const query = `
    SELECT id, content_id, question_no, mock_test_id, status, question_text, explanation
    FROM questions
    ORDER BY mock_test_id, question_no
    ${limit ? "LIMIT $1" : ""}
  `;
  const params = limit ? [limit] : [];
  const result = await client.query(query, params);
  return result.rows;
}

async function loadOptionsByContentId(client, contentIds) {
  if (contentIds.length === 0) return new Map();
  const result = await client.query(
    `SELECT id, options
     FROM question_contents
     WHERE id = ANY($1::uuid[])`,
    [contentIds],
  );
  const byContent = new Map();
  for (const row of result.rows) {
    byContent.set(
      row.id,
      (row.options || []).map((optionText, optionIndex) => ({
        option_index: optionIndex,
        option_text: optionText,
      })),
    );
  }
  return byContent;
}

async function run() {
  const { apply, limit } = parseArgs(process.argv.slice(2));

  console.log(
    apply
      ? "Running in APPLY mode - changes will be written to the database."
      : "Running in DRY RUN mode - no changes will be written (pass --apply to write).",
  );
  if (limit) console.log(`Limiting to first ${limit} question(s).`);
  console.log("");

  const client = await pool.connect();
  let changedQuestionCount = 0;
  let changedFieldCount = 0;

  try {
    const questions = await loadQuestions(client, limit);
    // Prints unconditionally, before any per-row decisions - if you see
    // this line but nothing after it, the fetch worked and every scanned
    // row already has correctly delimited (or no) math, i.e. there's
    // nothing to fix. If you DON'T see this line at all, the query itself
    // is failing/hanging - check DATABASE_URL / db:check first.
    console.log(`Fetched ${questions.length} question(s) to scan.\n`);

    const optionsByContent = await loadOptionsByContentId(
      client,
      questions.map((q) => q.content_id),
    );

    if (apply) await client.query("BEGIN");

    for (const question of questions) {
      const options = optionsByContent.get(question.content_id) || [];

      const nextText = wrapBareLatex(question.question_text);
      const nextExplanation = wrapBareLatex(question.explanation);
      const optionChanges = options
        .map((option) => ({
          option,
          nextText: wrapBareLatex(option.option_text),
        }))
        .filter(({ option, nextText: next }) => next !== option.option_text);

      const textChanged = nextText !== question.question_text;
      const explanationChanged = nextExplanation !== question.explanation;
      const anyChange =
        textChanged || explanationChanged || optionChanges.length > 0;

      if (!anyChange) continue;

      changedQuestionCount++;
      console.log(
        `Q${question.question_no} (${question.id}) in mock test ${question.mock_test_id}:`,
      );

      if (textChanged) {
        changedFieldCount++;
        console.log(`  text:        ${truncate(question.question_text)}`);
        console.log(`            -> ${truncate(nextText)}`);
      }
      if (explanationChanged) {
        changedFieldCount++;
        console.log(`  explanation: ${truncate(question.explanation)}`);
        console.log(`            -> ${truncate(nextExplanation)}`);
      }
      for (const { option, nextText: next } of optionChanges) {
        changedFieldCount++;
        console.log(
          `  option[${option.option_index}]: ${truncate(option.option_text)}`,
        );
        console.log(`            -> ${truncate(next)}`);
      }

      if (apply) {
        // text/explanation live on question_contents (migration 030) -
        // status is a slot field, so it's a separate UPDATE. Deliberately
        // NOT fork-on-edit here (unlike questions.service.js's
        // interactive editor) - this is a one-time, manually-reviewed,
        // dry-run-by-default cleanup pass, and if this content_id is
        // shared, fixing its LaTeX delimiters really is correct for
        // every mock test sharing it (it's the same underlying text,
        // this doesn't change its meaning) - unlike a genuine content
        // edit, there's no case here where two mock tests sharing this
        // question WANT different formatting for the same math.
        await client.query(
          `UPDATE question_contents
           SET question_text = $1, explanation = $2
           WHERE id = $3`,
          [nextText, nextExplanation, question.content_id],
        );
        await client.query(
          `UPDATE question_slots SET status = 'needs_review' WHERE id = $1`,
          [question.id],
        );
        if (optionChanges.length > 0) {
          const nextOptions = [...options.map((option) => option.option_text)];
          for (const { option, nextText: next } of optionChanges) {
            nextOptions[option.option_index] = next;
          }
          await client.query(
            `UPDATE question_contents SET options = $1::jsonb WHERE id = $2`,
            [JSON.stringify(nextOptions), question.content_id],
          );
        }
      }

      console.log("");
    }

    if (apply) await client.query("COMMIT");

    console.log(
      `${apply ? "Updated" : "Would update"} ${changedQuestionCount} question(s), ${changedFieldCount} field(s) total, out of ${questions.length} scanned.`,
    );
    if (!apply && changedQuestionCount > 0) {
      console.log("Re-run with --apply to write these changes.");
    }
    if (apply && changedQuestionCount > 0) {
      console.log(
        "Every changed question was reset to 'needs_review' - re-check them in ReviewTab before re-approving.",
      );
    }
  } catch (error) {
    console.error("Backfill failed partway through:", error);
    if (apply) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
