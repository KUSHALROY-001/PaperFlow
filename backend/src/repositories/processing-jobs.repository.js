import { pool } from "../db/pool.js";

const JOB_SELECT = `
  SELECT
    pj.*,
    mt.name AS mock_test_name,
    mt.cluster_id,
    c.name AS cluster_name,
    uf.original_filename
  FROM processing_jobs pj
  JOIN mock_tests mt ON mt.id = pj.mock_test_id
  JOIN clusters c ON c.id = mt.cluster_id
  LEFT JOIN uploaded_files uf ON uf.id = pj.uploaded_file_id
`;

export async function listJobs(workspaceId, { status, mockTestId }) {
  const result = await pool.query(
    `
    ${JOB_SELECT}
    WHERE pj.workspace_id = $1
      AND ($2::processing_status IS NULL OR pj.status = $2::processing_status)
      AND ($3::uuid IS NULL OR pj.mock_test_id = $3::uuid)
    ORDER BY pj.created_at DESC
    `,
    [workspaceId, status, mockTestId],
  );

  return result.rows;
}

export async function findJobById(jobId, workspaceId) {
  const result = await pool.query(
    `
    ${JOB_SELECT}
    WHERE pj.id = $1
      AND pj.workspace_id = $2
    `,
    [jobId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function updateJob(jobId, workspaceId, fields) {
  const {
    status,
    currentStageProvided,
    currentStage,
    progressPercent,
    outputSummary,
    errorMessageProvided,
    errorMessage,
  } = fields;

  const result = await pool.query(
    `
    UPDATE processing_jobs
    SET
      status = COALESCE($3::processing_status, status),
      current_stage = CASE WHEN $4::boolean THEN $5 ELSE current_stage END,
      progress_percent = COALESCE($6, progress_percent),
      output_summary = COALESCE($7, output_summary),
      error_message = CASE WHEN $8::boolean THEN $9 ELSE error_message END,
      started_at = CASE
        WHEN $3 = 'running' THEN COALESCE(started_at, now())
        ELSE started_at
      END,
      completed_at = CASE
        WHEN $3 IN ('completed', 'failed', 'cancelled') THEN COALESCE(completed_at, now())
        ELSE completed_at
      END
    WHERE id = $1
      AND workspace_id = $2
    RETURNING *
    `,
    [
      jobId,
      workspaceId,
      status,
      currentStageProvided,
      currentStage,
      progressPercent,
      outputSummary,
      errorMessageProvided,
      errorMessage,
    ],
  );

  return result.rows[0] || null;
}

export async function insertJobEvent({ jobId, stage, message, payload }) {
  await pool.query(
    `
    INSERT INTO processing_job_events (job_id, stage, message, payload)
    VALUES ($1, $2, $3, $4)
    `,
    [jobId, stage, message, payload],
  );
}
