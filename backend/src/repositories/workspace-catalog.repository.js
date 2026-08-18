import { pool } from "../db/pool.js";

export async function getWorkspaceCatalogSettings(workspaceId) {
  const result = await pool.query(
    `SELECT id, name, public_slug FROM workspaces WHERE id = $1`,
    [workspaceId],
  );
  return result.rows[0] || null;
}

export async function setPublicSlug(workspaceId, slug) {
  // slug is CITEXT UNIQUE (migration 025) - a duplicate hits the unique
  // constraint below rather than a pre-check here, so the error message
  // stays accurate even under a race between two admins picking the same
  // slug at once.
  try {
    const result = await pool.query(
      `
      UPDATE workspaces
      SET public_slug = $2, updated_at = now()
      WHERE id = $1
      RETURNING id, name, public_slug
      `,
      [workspaceId, slug],
    );
    return { row: result.rows[0] || null, conflict: false };
  } catch (error) {
    if (error.code === "23505") {
      // unique_violation
      return { row: null, conflict: true };
    }
    throw error;
  }
}

// Every mock test in the workspace, published or not, with its current
// listing flag - the admin management page needs the full set (to show
// "not published yet, can't list" state), not just what's already listed.
export async function listMockTestsForCatalogAdmin(workspaceId) {
  const result = await pool.query(
    `
    SELECT
      mt.id,
      mt.name,
      mt.exam_year,
      mt.status,
      mt.is_catalog_listed,
      mt.total_questions,
      c.name AS cluster_name
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE mt.workspace_id = $1
    ORDER BY mt.created_at DESC
    `,
    [workspaceId],
  );
  return result.rows;
}
