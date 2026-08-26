// One-off backfill for the math-validation hook added to
// worker/db.py#replace_questions (see math-validator.js/
// math_validator.py). That hook only protects questions extracted from
// here forward - this retroactively runs the same check against every
// question_contents row that already exists, so a question with broken
// LaTeX that's been sitting silently in the database (found only if a
// human happened to open that specific one) gets surfaced without
// waiting for that to happen.
//
// For every question_contents row with at least one broken math span:
// - Records the error(s) in metadata.mathErrors (same shape the worker
//   hook writes), so the Review Queue can show WHY a question was
//   flagged, not just that it was.
// - Drops confidence to 5 on every question_slots row referencing that
//   content (a content row can be shared by more than one mock test
//   since the question-content-sharing migration - see
//   030_shared_question_content.sql), so it sorts to the top of the
//   already-lowest-confidence-first Review Queue regardless of which
//   mock test it's in.
// - Resets status back to 'needs_review' on --apply, same as
//   backfill-code-formatting.js does for its own changes - EXCLUDING
//   already-'rejected' slots specifically, since those are intentionally
//   hidden duplicates (see migration 027) and finding a math error in
//   their now-largely-irrelevant content shouldn't resurrect them into
//   a live exam.
//
// Usage:
//   node src/db/backfill-math-validation.js                # dry run, all rows
//   node src/db/backfill-math-validation.js --limit 20      # dry run, first 20
//   node src/db/backfill-math-validation.js --apply         # actually writes

import { pool } from "./pool.js";
import { findAllMathErrors } from "../lib/math-validator.js";

const MATH_ERROR_CONFIDENCE = 5;

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

async function loadContentRows(client, limit) {
  const query = `
    SELECT id AS content_id, question_text, explanation, passage, options
    FROM question_contents
    ORDER BY created_at ASC
    ${limit ? "LIMIT $1" : ""}
  `;
  const params = limit ? [limit] : [];
  const result = await client.query(query, params);
  return result.rows;
}

async function run() {
  const { apply, limit } = parseArgs(process.argv.slice(2));

  console.log(
    apply
      ? "Running in APPLY mode - changes will be written to the database."
      : "Running in DRY RUN mode - no changes will be written (pass --apply to write).",
  );
  if (limit) console.log(`Limiting to first ${limit} question_contents row(s).`);
  console.log("");

  const client = await pool.connect();
  let flaggedCount = 0;
  let slotsUpdated = 0;

  try {
    const rows = await loadContentRows(client, limit);
    console.log(`Fetched ${rows.length} question_contents row(s) to check.\n`);

    if (apply) await client.query("BEGIN");

    for (const row of rows) {
      const errors = findAllMathErrors({
        questionText: row.question_text,
        explanation: row.explanation,
        passage: row.passage,
        options: row.options,
      });

      if (errors.length === 0) continue;

      flaggedCount++;
      console.log(`Content Row (${row.content_id}):`);
      for (const err of errors) {
        console.log(`  [${err.field}] ${err.error}`);
        console.log(`    in: ${truncate(err.expr)}`);
      }

      if (apply) {
        await client.query(
          `UPDATE question_contents
           SET metadata = metadata || jsonb_build_object('mathErrors', $1::jsonb)
           WHERE id = $2`,
          [JSON.stringify(errors), row.content_id],
        );

        const slotResult = await client.query(
          `UPDATE question_slots
           SET confidence = $1,
               status = CASE WHEN status <> 'rejected' THEN 'needs_review' ELSE status END
           WHERE content_id = $2
           RETURNING id`,
          [MATH_ERROR_CONFIDENCE, row.content_id],
        );
        slotsUpdated += slotResult.rowCount;
      }

      console.log("");
    }

    if (apply) await client.query("COMMIT");

    console.log(
      `${apply ? "Flagged" : "Would flag"} ${flaggedCount} question_contents row(s) out of ${rows.length} scanned.`,
    );
    if (apply && flaggedCount > 0) {
      console.log(
        `${slotsUpdated} question_slots row(s) had confidence dropped to ${MATH_ERROR_CONFIDENCE} and status reset to 'needs_review' (rejected slots left untouched).`,
      );
    }
    if (!apply && flaggedCount > 0) {
      console.log("Re-run with --apply to write these changes.");
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
