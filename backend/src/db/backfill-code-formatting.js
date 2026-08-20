// One-off backfill for fence-based code rendering overhaul.
//
// For every question_contents row where has_code = true:
// - Splices code_snippet (or question_text itself for pre-migration-017 rows with no code_snippet)
//   back into question_text as a real ``` fence, prefixed with code_language if present.
// - Sets affected question_slots status back to 'needs_review' on --apply.
//
// Usage:
//   node src/db/backfill-code-formatting.js                # dry run, all rows
//   node src/db/backfill-code-formatting.js --limit 20      # dry run, first 20
//   node src/db/backfill-code-formatting.js --apply         # actually writes
//   npm run db:backfill-code -- --apply                     # via package.json script

import { pool } from "./pool.js";
import { autoIndentMarkdown } from "../lib/code-indenter.js";

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

async function loadCodeQuestions(client, limit) {
  const query = `
    SELECT
      qc.id AS content_id,
      qc.question_text
    FROM question_contents qc
    WHERE qc.question_text LIKE '%\`\`\`%'
       OR qc.question_text ILIKE '%#include%'
       OR qc.question_text ILIKE '%int main%'
       OR qc.question_text ILIKE '%public static void%'
    ORDER BY qc.created_at ASC
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
  if (limit)
    console.log(`Limiting to first ${limit} question_contents row(s).`);
  console.log("");

  const client = await pool.connect();
  let changedCount = 0;

  try {
    const rows = await loadCodeQuestions(client, limit);
    console.log(
      `Fetched ${rows.length} code-bearing question_contents row(s) to process.\n`,
    );

    if (apply) await client.query("BEGIN");

    for (const row of rows) {
      const nextText = autoIndentMarkdown(row.question_text);

      if (nextText === row.question_text) continue;

      changedCount++;
      console.log(`Content Row (${row.content_id}):`);
      console.log(`  old text:    ${truncate(row.question_text)}`);
      console.log(`            -> ${truncate(nextText)}`);

      if (apply) {
        await client.query(
          `UPDATE question_contents
           SET question_text = $1
           WHERE id = $2`,
          [nextText, row.content_id],
        );
        await client.query(
          `UPDATE question_slots
           SET status = 'needs_review'
           WHERE content_id = $1`,
          [row.content_id],
        );
      }

      console.log("");
    }

    if (apply) await client.query("COMMIT");

    console.log(
      `${apply ? "Updated" : "Would update"} ${changedCount} question_contents row(s) out of ${rows.length} scanned.`,
    );
    if (!apply && changedCount > 0) {
      console.log("Re-run with --apply to write these changes.");
    }
    if (apply && changedCount > 0) {
      console.log(
        "Every affected question slot was reset to 'needs_review'.",
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
