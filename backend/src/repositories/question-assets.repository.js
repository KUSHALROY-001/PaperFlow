import { pool } from "../db/pool.js";

// No separate service layer, deliberately - asset lookups are simple
// enough to live directly in the controllers that already serve
// questions/attempts; introducing a service here would be ceremony
// without payoff, matching how thin this table's access pattern is.

export async function findAssetForQuestion(questionId) {
  const result = await pool.query(
    `SELECT id, question_id, asset_type, storage_path, page_number, created_at
     FROM question_assets
     WHERE question_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [questionId],
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
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
       id, question_id, asset_type, storage_path, page_number, created_at
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
       qa.id, qa.question_id, qa.asset_type, qa.storage_path, qa.page_number, qa.created_at
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
    pageNumber: row.page_number,
    createdAt: row.created_at,
  };
}
