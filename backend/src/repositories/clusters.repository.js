import { pool } from "../db/pool.js";

export async function listClusters(workspaceId) {
  const result = await pool.query(
    `
    SELECT
      c.*,
      creator.name AS creator_name,
      count(mt.id)::INT AS mock_test_count
    FROM clusters c
    LEFT JOIN mock_tests mt ON mt.cluster_id = c.id
    LEFT JOIN users creator ON creator.id = c.created_by
    WHERE c.workspace_id = $1
    GROUP BY c.id, creator.name
    ORDER BY c.created_at DESC
    `,
    [workspaceId],
  );

  return result.rows;
}

export async function createCluster({
  workspaceId,
  createdBy,
  name,
  description,
}) {
  const result = await pool.query(
    `
    INSERT INTO clusters (workspace_id, created_by, name, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [workspaceId, createdBy, name, description],
  );

  return result.rows[0];
}

export async function findClusterById(clusterId, workspaceId, client = pool) {
  const result = await client.query(
    "SELECT * FROM clusters WHERE id = $1 AND workspace_id = $2",
    [clusterId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function updateCluster(
  clusterId,
  workspaceId,
  { name, descriptionProvided, description },
) {
  const result = await pool.query(
    `
    UPDATE clusters
    SET
      name = COALESCE($3, name),
      description = CASE WHEN $4::boolean THEN $5 ELSE description END
    WHERE id = $1
      AND workspace_id = $2
    RETURNING *
    `,
    [clusterId, workspaceId, name || null, descriptionProvided, description],
  );

  return result.rows[0] || null;
}

export async function deleteCluster(clusterId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM clusters WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [clusterId, workspaceId],
  );

  return result.rowCount > 0;
}

export async function listMockTestsForCluster(clusterId, workspaceId) {
  const result = await pool.query(
    `
    SELECT mt.*
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE mt.cluster_id = $1
      AND c.workspace_id = $2
    ORDER BY mt.created_at DESC
    `,
    [clusterId, workspaceId],
  );

  return result.rows;
}

// Fetches every mock test id + workspace id under a cluster, used so the
// service layer can clean up their upload directories before the DB cascade
// delete removes the rows.
export async function listMockTestIdsForCluster(clusterId, workspaceId) {
  const result = await pool.query(
    "SELECT id FROM mock_tests WHERE cluster_id = $1 AND workspace_id = $2",
    [clusterId, workspaceId],
  );

  return result.rows.map((row) => row.id);
}

export async function createMockTestInCluster({
  workspaceId,
  clusterId,
  createdBy,
  name,
  description,
  examYear,
  durationMinutes,
  marksPerCorrect,
  negativeMarksPerWrong,
}) {
  const result = await pool.query(
    `
    INSERT INTO mock_tests (
      workspace_id,
      cluster_id,
      created_by,
      name,
      description,
      exam_year,
      duration_minutes,
      marks_per_correct,
      negative_marks_per_wrong
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      workspaceId,
      clusterId,
      createdBy,
      name,
      description,
      examYear,
      durationMinutes,
      marksPerCorrect,
      negativeMarksPerWrong,
    ],
  );

  return result.rows[0];
}
