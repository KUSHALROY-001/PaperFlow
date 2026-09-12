import { pool } from "../db/pool.js";

// Joins both sides of a pair back to their own question + mock test, so
// the report can show "Question 12 from Mock Test A" alongside "Question 4
// from Mock Test B" without a second round trip per pair. Most-similar
// first, same ordering the old review queue used - still the most useful
// order for a report, even without anything to action.
const ALL_PAIRS_SELECT = `
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
    qa.options AS question_a_options,
    mta.id AS mock_test_a_id,
    mta.name AS mock_test_a_name,
    qb.id AS question_b_id,
    qb.question_no AS question_b_no,
    qb.subtopic AS question_b_subtopic,
    qb.passage AS question_b_passage,
    qb.question_text AS question_b_text,
    qb.explanation AS question_b_explanation,
    qb.options AS question_b_options,
    mtb.id AS mock_test_b_id,
    mtb.name AS mock_test_b_name
  FROM question_duplicate_pairs dp
  JOIN questions qa ON qa.id = dp.question_id_a
  JOIN mock_tests mta ON mta.id = qa.mock_test_id
  JOIN questions qb ON qb.id = dp.question_id_b
  JOIN mock_tests mtb ON mtb.id = qb.mock_test_id
`;

// Every detected pair is "live" now - there's no pending/confirmed/
// dismissed split anymore, so nothing to filter out. The service groups
// these edges (transitively) into duplicate-question groups.
export async function listDuplicatePairs(workspaceId) {
  const result = await pool.query(
    `
    ${ALL_PAIRS_SELECT}
    WHERE dp.workspace_id = $1
    ORDER BY dp.similarity_score DESC, dp.detected_at ASC
    `,
    [workspaceId],
  );

  return result.rows;
}
