import { pool } from "../db/pool.js";

// One row per cohort, with member count and an aggregate average score
// computed across every submitted attempt made by any current member -
// NOT an average of each member's own average (that would over/under-
// weight students with different attempt counts). Cohorts with zero
// members, or members with zero submitted attempts, correctly show
// averageScore: null rather than 0 (NULLIF avoids a divide-by-zero
// collapsing to a misleading 0%).
export async function listCohorts(workspaceId) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c.created_at AS "createdAt",
      COUNT(DISTINCT cm.taker_email)::int AS "memberCount",
      AVG(ea.score) FILTER (WHERE ea.status = 'submitted') AS "averageScore"
    FROM cohorts c
    LEFT JOIN cohort_members cm ON cm.cohort_id = c.id
    LEFT JOIN exam_attempts ea
      ON ea.taker_email = cm.taker_email AND ea.workspace_id = c.workspace_id
    WHERE c.workspace_id = $1
    GROUP BY c.id, c.name, c.created_at
    ORDER BY c.created_at DESC
    `,
    [workspaceId],
  );

  return result.rows;
}

export async function findCohortById(cohortId, workspaceId) {
  const result = await pool.query(
    `SELECT * FROM cohorts WHERE id = $1 AND workspace_id = $2`,
    [cohortId, workspaceId],
  );
  return result.rows[0] || null;
}

export async function createCohort(workspaceId, name) {
  const result = await pool.query(
    `
    INSERT INTO cohorts (workspace_id, name)
    VALUES ($1, $2)
    RETURNING id, name, created_at AS "createdAt"
    `,
    [workspaceId, name],
  );
  return result.rows[0];
}

// Members list for one cohort - the detail view's roster within a cohort.
// Reuses the same shape as students.repository.js#listStudents (email,
// name, attemptsTaken, averageScore, lastActive) so the frontend can
// render it with the exact same row component.
export async function listCohortMembers(cohortId, workspaceId) {
  const result = await pool.query(
    `
    WITH latest_name AS (
      SELECT DISTINCT ON (taker_email)
        taker_email,
        metadata->>'guestName' AS name
      FROM exam_attempts
      WHERE workspace_id = $2
        AND taker_email IS NOT NULL
      ORDER BY taker_email, started_at DESC
    )
    SELECT
      cm.taker_email AS email,
      ln.name,
      COUNT(ea.*) FILTER (WHERE ea.status = 'submitted')::int AS "attemptsTaken",
      AVG(ea.score) FILTER (WHERE ea.status = 'submitted') AS "averageScore",
      MAX(ea.submitted_at) AS "lastActive"
    FROM cohort_members cm
    LEFT JOIN latest_name ln ON ln.taker_email = cm.taker_email
    LEFT JOIN exam_attempts ea
      ON ea.taker_email = cm.taker_email AND ea.workspace_id = $2
    WHERE cm.cohort_id = $1
    GROUP BY cm.taker_email, ln.name
    ORDER BY "lastActive" DESC NULLS LAST
    `,
    [cohortId, workspaceId],
  );
  return result.rows;
}

// ON CONFLICT DO NOTHING - adding someone already in the cohort is a
// no-op, not an error (the UI lets you add from the roster without first
// checking membership).
export async function addCohortMember(cohortId, email) {
  await pool.query(
    `
    INSERT INTO cohort_members (cohort_id, taker_email)
    VALUES ($1, $2)
    ON CONFLICT (cohort_id, taker_email) DO NOTHING
    `,
    [cohortId, email],
  );
}

export async function removeCohortMember(cohortId, email) {
  await pool.query(
    `DELETE FROM cohort_members WHERE cohort_id = $1 AND taker_email = $2`,
    [cohortId, email],
  );
}
