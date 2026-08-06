import { pool } from "../db/pool.js";

export async function findActiveShareForMockTest(mockTestId) {
  const result = await pool.query(
    `
    SELECT *
    FROM shared_mock_tests
    WHERE mock_test_id = $1
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [mockTestId],
  );

  return result.rows[0] || null;
}

export async function insertShare(
  client,
  { mockTestId, shareToken, expiresAt },
) {
  const result = await client.query(
    `
    INSERT INTO shared_mock_tests (mock_test_id, share_token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [mockTestId, shareToken, expiresAt || null],
  );

  return result.rows[0];
}

export async function listSharesForMockTest(mockTestId) {
  const result = await pool.query(
    `
    SELECT *
    FROM shared_mock_tests
    WHERE mock_test_id = $1
    ORDER BY created_at DESC
    `,
    [mockTestId],
  );

  return result.rows;
}

// Resolves a public share token all the way to the mock test + its
// workspace. This is the ONLY thing that stands between an unauthenticated
// visitor and workspace-scoped data on the public /api/shared routes, so it
// deliberately re-checks is_active/expires_at here rather than trusting a
// caller to have already validated the share (defense in depth - a share
// that expires mid-session should stop working immediately, not just stop
// showing up in "create new" listings).
export async function findValidShareByToken(shareToken) {
  const result = await pool.query(
    `
    SELECT
      smt.id AS share_id,
      smt.share_token,
      smt.is_active,
      smt.expires_at,
      mt.id AS mock_test_id,
      mt.workspace_id,
      mt.name AS mock_test_name,
      mt.description AS mock_test_description,
      mt.duration_minutes,
      mt.marks_per_correct,
      mt.negative_marks_per_wrong,
      mt.total_questions,
      mt.status AS mock_test_status
    FROM shared_mock_tests smt
    JOIN mock_tests mt ON mt.id = smt.mock_test_id
    WHERE smt.share_token = $1
      AND smt.is_active = TRUE
      AND (smt.expires_at IS NULL OR smt.expires_at > now())
    `,
    [shareToken],
  );

  return result.rows[0] || null;
}

export async function deactivateShare(shareId, mockTestId) {
  const result = await pool.query(
    `
    UPDATE shared_mock_tests
    SET is_active = FALSE
    WHERE id = $1
      AND mock_test_id = $2
    RETURNING id
    `,
    [shareId, mockTestId],
  );

  return result.rowCount > 0;
}
