import { pool } from "../db/pool.js";

// No separate service layer, deliberately - asset lookups are simple
// enough to live directly in the controllers that already serve
// questions/attempts; introducing a service here would be ceremony
// without payoff, matching how thin this table's access pattern is.
//
// Multi-image (migration 038): a question can now have more than one
// asset, each keyed by its own slot_key (UNIQUE per question). 'default'
// is the slot every pre-038 row already has - like any other slot, its
// position comes entirely from wherever its own ![[img:default]] marker
// sits in the question's text/options/table cells (see migration 041,
// which backfilled that marker for every question that used to rely on
// the now-removed placement column). Every function below now returns
// or accepts a slot_key explicitly; nothing here still assumes "one asset
// per question."

export async function findAssetsForQuestion(questionId) {
  const result = await pool.query(
    `SELECT id, question_id, slot_key, asset_type, storage_path,
            source, page_number, created_at
     FROM question_assets
     WHERE question_id = $1
     ORDER BY (slot_key <> 'default'), slot_key ASC`,
    [questionId],
  );

  return result.rows.map(mapRow);
}

export async function findAssetForSlot(questionId, slotKey) {
  const result = await pool.query(
    `SELECT id, question_id, slot_key, asset_type, storage_path,
            source, page_number, created_at
     FROM question_assets
     WHERE question_id = $1 AND slot_key = $2`,
    [questionId, slotKey],
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteAsset(assetId) {
  await pool.query(`DELETE FROM question_assets WHERE id = $1`, [assetId]);
}

export async function deleteAssetForSlot(questionId, slotKey) {
  await pool.query(
    `DELETE FROM question_assets WHERE question_id = $1 AND slot_key = $2`,
    [questionId, slotKey],
  );
}

// A crop overwrites an existing Cloudinary public ID. Bumping created_at
// gives all versioned delivery URLs a fresh cache key for that same slot.
export async function touchAsset(assetId) {
  const result = await pool.query(
    `UPDATE question_assets SET created_at = now() WHERE id = $1
     RETURNING id, question_id, slot_key, asset_type, storage_path,
               source, page_number, created_at`,
    [assetId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

// The DB half of a manual image upload/replace for ONE slot (see
// question-assets.controller.js#uploadDiagramImage, which uploads to
// Cloudinary BEFORE calling this). Deliberately the OPPOSITE order from
// worker.py's extraction path (which commits the question_assets row
// first, inside the same transaction as the question itself, and uploads
// the actual file bytes after, best-effort) - these are two different
// situations, not one convention: a bulk extraction inserting potentially
// thousands of questions shouldn't fail an entire question over one flaky
// file upload, so degrading to "row exists, file missing" is the right
// trade there. A manual upload is one single interactive user action -
// if Cloudinary-first failed silently and the DB write still succeeded,
// the user would see a false "success" for an image that was never
// actually saved, with no error to prompt them to retry. Uploading first
// here means a failure surfaces immediately as a failed request instead.
//
// INSERT ... ON CONFLICT (question_id, slot_key) DO UPDATE, not the old
// DELETE-then-INSERT: that pattern enforced a one-asset-per-question
// invariant by construction (deleting every row before inserting the one
// new one), which is exactly what migration 038 removes. Replacing slot
// "diagram-2" must never touch slot "default" or any other slot the same
// question has - an upsert scoped to (question_id, slot_key) via the
// UNIQUE constraint from that migration is what makes that scoping
// atomic and race-safe instead of a separate SELECT-then-INSERT-or-UPDATE.
export async function upsertAssetForSlot(
  questionId,
  slotKey,
  { storagePath, source, pageNumber = null },
) {
  const result = await pool.query(
    `INSERT INTO question_assets
       (question_id, slot_key, asset_type, storage_path, source, page_number)
     VALUES ($1, $2, 'diagram', $3, $4, $5)
     ON CONFLICT (question_id, slot_key) DO UPDATE
       SET storage_path = EXCLUDED.storage_path,
           source = EXCLUDED.source,
           page_number = EXCLUDED.page_number
     RETURNING id, question_id, slot_key, asset_type, storage_path,
               source, page_number, created_at`,
    [questionId, slotKey, storagePath, source, pageNumber],
  );
  return mapRow(result.rows[0]);
}

// Batch lookup for a whole mock test's worth of questions in one query -
// used by listPlayableQuestions / listQuestionsWithAnswersForAttempt /
// the editor's question list, so rendering N questions doesn't cost N
// extra queries. Returns EVERY asset per question now (an array), not
// just the first one found.
export async function findAssetsForQuestions(questionIds) {
  if (!questionIds || questionIds.length === 0) {
    return new Map();
  }

  const result = await pool.query(
    `SELECT id, question_id, slot_key, asset_type, storage_path,
            source, page_number, created_at
     FROM question_assets
     WHERE question_id = ANY($1::uuid[])
     ORDER BY question_id, (slot_key <> 'default'), slot_key ASC`,
    [questionIds],
  );

  const byQuestionId = new Map();
  for (const row of result.rows) {
    const mapped = mapRow(row);
    const key = String(row.question_id);
    const existing = byQuestionId.get(key);
    if (existing) {
      existing.push(mapped);
    } else {
      byQuestionId.set(key, [mapped]);
    }
  }
  return byQuestionId;
}

// Convenience wrapper for the common case: "give me every asset for this
// whole mock test", when the caller doesn't already have the question ID
// list in hand (e.g. building the editor's initial question list).
export async function findAssetsForMockTest(mockTestId) {
  const result = await pool.query(
    `SELECT qa.id, qa.question_id, qa.slot_key, qa.asset_type, qa.storage_path,
            qa.source, qa.page_number, qa.created_at
     FROM question_assets qa
     INNER JOIN questions q ON q.id = qa.question_id
     WHERE q.mock_test_id = $1
     ORDER BY qa.question_id, (qa.slot_key <> 'default'), qa.slot_key ASC`,
    [mockTestId],
  );

  const byQuestionId = new Map();
  for (const row of result.rows) {
    const mapped = mapRow(row);
    const key = String(row.question_id);
    const existing = byQuestionId.get(key);
    if (existing) {
      existing.push(mapped);
    } else {
      byQuestionId.set(key, [mapped]);
    }
  }
  return byQuestionId;
}

function mapRow(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    slotKey: row.slot_key,
    assetType: row.asset_type,
    storagePath: row.storage_path,
    source: row.source,
    pageNumber: row.page_number,
    createdAt: row.created_at,
  };
}
