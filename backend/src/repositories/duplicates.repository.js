import { pool } from "../db/pool.js";

// Joins both sides of a pair back to their own question + mock test +
// cluster, so the review UI can show "Question 12 from Mock Test A"
// alongside "Question 4 from Mock Test B" without a second round trip per
// pair. Most-similar first - the pairs a reviewer will find least
// ambiguous to act on.
//
// Both questions' options are pulled via the same jsonb_agg-per-question
// pattern attempts.repository.js#listQuestionsWithAnswersForAttempt uses
// - options live in their own question_options table, not a column on
// questions - so DuplicatePairCard.jsx's two <QuestionContent> renders
// have everything they need (including has_code/code_language/
// code_snippet) without a second request per side.
//
// question_options.question_id references question_contents(id), not a
// slot's own id (migration 030) - both options subqueries below key off
// qa.content_id/qb.content_id, not qa.id/qb.id, via the `questions`
// compatibility view's own content_id column.
const PENDING_SELECT = `
  SELECT
    dp.id,
    dp.workspace_id,
    dp.similarity_score,
    dp.detected_at,
    qa.id AS question_a_id,
    qa.question_no AS question_a_no,
    qa.subtopic AS question_a_subtopic,
    qa.passage AS question_a_passage,
    qa.question_text AS question_a_text,
    qa.explanation AS question_a_explanation,
    qa.has_code AS question_a_has_code,
    qa.code_language AS question_a_code_language,
    qa.code_snippet AS question_a_code_snippet,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('optionIndex', qo.option_index, 'optionText', qo.option_text)
          ORDER BY qo.option_index
        )
        FROM question_options qo
        WHERE qo.question_id = qa.content_id
      ),
      '[]'::jsonb
    ) AS question_a_options,
    mta.id AS mock_test_a_id,
    mta.name AS mock_test_a_name,
    qb.id AS question_b_id,
    qb.question_no AS question_b_no,
    qb.subtopic AS question_b_subtopic,
    qb.passage AS question_b_passage,
    qb.question_text AS question_b_text,
    qb.explanation AS question_b_explanation,
    qb.has_code AS question_b_has_code,
    qb.code_language AS question_b_code_language,
    qb.code_snippet AS question_b_code_snippet,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('optionIndex', qo.option_index, 'optionText', qo.option_text)
          ORDER BY qo.option_index
        )
        FROM question_options qo
        WHERE qo.question_id = qb.content_id
      ),
      '[]'::jsonb
    ) AS question_b_options,
    mtb.id AS mock_test_b_id,
    mtb.name AS mock_test_b_name
  FROM question_duplicate_pairs dp
  JOIN questions qa ON qa.id = dp.question_id_a
  JOIN mock_tests mta ON mta.id = qa.mock_test_id
  JOIN questions qb ON qb.id = dp.question_id_b
  JOIN mock_tests mtb ON mtb.id = qb.mock_test_id
`;

export async function listPendingDuplicates(workspaceId) {
  const result = await pool.query(
    `
    ${PENDING_SELECT}
    WHERE dp.workspace_id = $1
      AND dp.status = 'pending'
    ORDER BY dp.similarity_score DESC, dp.detected_at ASC
    `,
    [workspaceId],
  );

  return result.rows;
}

export async function countPendingDuplicates(workspaceId) {
  const result = await pool.query(
    `
    SELECT count(*)::int AS count
    FROM question_duplicate_pairs
    WHERE workspace_id = $1
      AND status = 'pending'
    `,
    [workspaceId],
  );

  return result.rows[0].count;
}

export async function findPendingPairById(pairId, workspaceId) {
  const result = await pool.query(
    `
    SELECT dp.*, qa.mock_test_id AS mock_test_a_id, qb.mock_test_id AS mock_test_b_id
    FROM question_duplicate_pairs dp
    JOIN questions qa ON qa.id = dp.question_id_a
    JOIN questions qb ON qb.id = dp.question_id_b
    WHERE dp.id = $1
      AND dp.workspace_id = $2
      AND dp.status = 'pending'
    `,
    [pairId, workspaceId],
  );

  return result.rows[0] || null;
}

// Called inside the caller's own transaction (see
// duplicates.service.js#resolveDuplicate, which also - for a 'confirmed'
// resolution - repoints the losing slot onto the winner's content in the
// SAME transaction, see repointSlotContent below) so a pair never ends up
// marked resolved while the question it was about stays untouched, or
// vice versa, if either write fails.
export async function resolveDuplicatePair(
  client,
  pairId,
  workspaceId,
  { status, resolvedBy },
) {
  const result = await client.query(
    `
    UPDATE question_duplicate_pairs
    SET status = $3,
        resolved_at = now(),
        resolved_by = $4
    WHERE id = $1
      AND workspace_id = $2
      AND status = 'pending'
    RETURNING *
    `,
    [pairId, workspaceId, status, resolvedBy],
  );

  return result.rows[0] || null;
}

// The actual storage dedup a 'merge' resolution performs (migration 030):
// repoints the losing slot's content_id onto the winning slot's, so both
// mock tests' questions now share one question_contents row instead of
// two independent ones.
export async function repointSlotContent(
  client,
  loserSlotId,
  winnerContentId,
  workspaceId,
) {
  await client.query(
    `
    UPDATE question_slots
    SET content_id = $2
    WHERE id = $1
      AND workspace_id = $3
    `,
    [loserSlotId, winnerContentId, workspaceId],
  );
}

export async function getSlotContentId(client, slotId, workspaceId) {
  const result = await client.query(
    `SELECT content_id FROM question_slots WHERE id = $1 AND workspace_id = $2`,
    [slotId, workspaceId],
  );
  return result.rows[0]?.content_id || null;
}

// Reclaims a content row a merge just made unreachable - unlike a
// rejected question (027's own conservative "leave it, a human can clean
// it up" stance, since a student may have already answered that exact
// slot), a content row has no exam_answers pointing at it directly
// (exam_answers.question_id references question_slots, not
// question_contents - the slot itself, and its answer history, are
// completely untouched by a merge). So once nothing references it,
// deleting it is genuine, safe space reclamation, not just a schema
// tidy-up - the real "only one question would be there" the merge
// feature exists for. The NOT EXISTS guard makes this a safe no-op if
// the content somehow still has another slot pointing at it.
export async function deleteOrphanedContent(client, contentId) {
  await client.query(
    `
    DELETE FROM question_contents
    WHERE id = $1
      AND NOT EXISTS (
        SELECT 1 FROM question_slots WHERE content_id = $1
      )
    `,
    [contentId],
  );
}
