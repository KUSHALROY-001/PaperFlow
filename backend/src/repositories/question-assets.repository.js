import { pool } from "../db/pool.js";

// No separate service layer, deliberately - asset lookups are simple
// enough to live directly in the controllers that already serve
// questions/attempts; introducing a service here would be ceremony
// without payoff, matching how thin this table's access pattern is.

export async function findAssetForQuestion(questionId) {
  const result = await pool.query(
    `SELECT id, question_id, asset_type, storage_path, original_storage_path,
            has_manual_crop, source, placement, page_number, created_at
     FROM question_assets
     WHERE question_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [questionId],
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

// Flips has_manual_crop after the controller has already overwritten (crop)
// or restored (reset) the bytes at storage_path on disk - this call is
// intentionally just the DB half of that pair, never the file write, so the
// two stay easy to reason about independently and a failed sharp() call
// never leaves the flag out of sync with the file.
export async function setManualCrop(assetId, hasManualCrop) {
  await pool.query(
    `UPDATE question_assets SET has_manual_crop = $2 WHERE id = $1`,
    [assetId, hasManualCrop],
  );
}

// Placement is independent of source (an extracted diagram is just as
// repositionable as a manually uploaded one), so this is never called
// from the same place as the upload/crop endpoints - it's its own PATCH.
export async function setPlacement(assetId, placement) {
  const result = await pool.query(
    `UPDATE question_assets SET placement = $2 WHERE id = $1
     RETURNING id, question_id, asset_type, storage_path, original_storage_path,
               has_manual_crop, source, placement, page_number, created_at`,
    [assetId, placement],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteAsset(assetId) {
  await pool.query(`DELETE FROM question_assets WHERE id = $1`, [assetId]);
}

// The DB half of a manual image upload/replace (see
// question-assets.controller.js#uploadDiagramImage, which writes the files
// to disk BEFORE calling this - same file-then-row ordering worker.py
// uses, for the same reason: a row can point at a file that briefly
// doesn't exist yet under concurrent load, never the reverse).
//
// DELETE-then-INSERT in one transaction rather than an UPDATE, because
// this also has to work for a question that currently has ZERO assets
// (nothing extracted at all - the whole reason this feature exists) as
// well as one replacing an existing row, without the caller needing to
// know which case it is. Also enforces the one-asset-per-question
// invariant the rest of the app already assumes (see findAssetForQuestion's
// LIMIT 1) at the single place that can violate it, without a DB
// constraint - see migration 015's rationale for why not a UNIQUE index.
export async function replaceAssetForQuestion(
  questionId,
  { storagePath, originalStoragePath, source, placement, pageNumber = null },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM question_assets WHERE question_id = $1`, [
      questionId,
    ]);
    const result = await client.query(
      `INSERT INTO question_assets
         (question_id, asset_type, storage_path, original_storage_path, source, placement, page_number)
       VALUES ($1, 'diagram', $2, $3, $4, $5, $6)
       RETURNING id, question_id, asset_type, storage_path, original_storage_path,
                 has_manual_crop, source, placement, page_number, created_at`,
      [
        questionId,
        storagePath,
        originalStoragePath,
        source,
        placement,
        pageNumber,
      ],
    );
    await client.query("COMMIT");
    return mapRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Batch lookup for a whole mock test's worth of questions in one query -
// used by listPlayableQuestions / listQuestionsWithAnswersForAttempt /
// the editor's question list, so rendering N questions doesn't cost N
// extra queries.
export async function findAssetsForQuestions(questionIds) {
  if (!questionIds || questionIds.length === 0) {
    return new Map();
  }

  const result = await pool.query(
    `SELECT DISTINCT ON (question_id)
       id, question_id, asset_type, storage_path, original_storage_path,
       has_manual_crop, source, placement, page_number, created_at
     FROM question_assets
     WHERE question_id = ANY($1::uuid[])
     ORDER BY question_id, created_at ASC`,
    [questionIds],
  );

  const byQuestionId = new Map();
  for (const row of result.rows) {
    byQuestionId.set(row.question_id, mapRow(row));
  }
  return byQuestionId;
}

// Convenience wrapper for the common case: "give me every asset for this
// whole mock test", when the caller doesn't already have the question ID
// list in hand (e.g. building the editor's initial question list).
export async function findAssetsForMockTest(mockTestId) {
  const result = await pool.query(
    `SELECT DISTINCT ON (qa.question_id)
       qa.id, qa.question_id, qa.asset_type, qa.storage_path, qa.original_storage_path,
       qa.has_manual_crop, qa.source, qa.placement, qa.page_number, qa.created_at
     FROM question_assets qa
     INNER JOIN questions q ON q.id = qa.question_id
     WHERE q.mock_test_id = $1
     ORDER BY qa.question_id, qa.created_at ASC`,
    [mockTestId],
  );

  const byQuestionId = new Map();
  for (const row of result.rows) {
    byQuestionId.set(row.question_id, mapRow(row));
  }
  return byQuestionId;
}

function mapRow(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    assetType: row.asset_type,
    storagePath: row.storage_path,
    originalStoragePath: row.original_storage_path,
    hasManualCrop: row.has_manual_crop,
    source: row.source,
    placement: row.placement,
    pageNumber: row.page_number,
    createdAt: row.created_at,
  };
}
