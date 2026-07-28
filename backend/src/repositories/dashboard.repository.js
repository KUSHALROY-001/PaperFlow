import { pool } from "../db/pool.js";

export async function getSummaryStats(workspaceId) {
  const result = await pool.query(
    `
    SELECT
      (SELECT count(*)::INT FROM clusters WHERE workspace_id = $1) AS total_clusters,
      (SELECT count(*)::INT FROM mock_tests WHERE workspace_id = $1) AS total_mock_tests,
      (SELECT count(*)::INT FROM mock_tests WHERE workspace_id = $1 AND status = 'published') AS completed_mocks,
      (SELECT count(*)::INT FROM mock_tests WHERE workspace_id = $1 AND status = 'review') AS needs_review,
      (SELECT count(*)::INT FROM processing_jobs WHERE workspace_id = $1 AND status IN ('queued', 'running')) AS active_jobs
    `,
    [workspaceId],
  );

  return result.rows[0];
}

export async function getRecentClusters(workspaceId, limit = 5) {
  const result = await pool.query(
    `
    SELECT
      c.*,
      count(mt.id)::INT AS mock_test_count,
      count(mt.id) FILTER (WHERE mt.status = 'published')::INT AS ready_count,
      count(mt.id) FILTER (WHERE mt.status = 'processing')::INT AS processing_count,
      count(mt.id) FILTER (WHERE mt.status = 'review')::INT AS review_count,
      (
        SELECT mt2.name
        FROM mock_tests mt2
        WHERE mt2.cluster_id = c.id
        ORDER BY mt2.created_at DESC
        LIMIT 1
      ) AS latest_mock_test_name
    FROM clusters c
    LEFT JOIN mock_tests mt ON mt.cluster_id = c.id
    WHERE c.workspace_id = $1
    GROUP BY c.id
    ORDER BY c.updated_at DESC
    LIMIT $2
    `,
    [workspaceId, limit],
  );

  return result.rows;
}

export async function getActiveJobs(workspaceId, limit = 5) {
  const result = await pool.query(
    `
    SELECT
      pj.*,
      mt.name AS mock_test_name,
      mt.cluster_id,
      c.name AS cluster_name
    FROM processing_jobs pj
    JOIN mock_tests mt ON mt.id = pj.mock_test_id
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE pj.workspace_id = $1
      AND pj.status IN ('queued', 'running')
    ORDER BY pj.created_at DESC
    LIMIT $2
    `,
    [workspaceId, limit],
  );

  return result.rows;
}
