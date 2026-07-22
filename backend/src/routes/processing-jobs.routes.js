import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/async-handler.js';
import { httpError } from '../lib/http-error.js';

export const processingJobsRouter = Router();

processingJobsRouter.get('/', asyncHandler(async (req, res) => {
  const status = req.query.status || null;
  const mockTestId = req.query.mockTestId || null;

  const result = await pool.query(
    `
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
    WHERE pj.workspace_id = $1
      AND ($2::processing_status IS NULL OR pj.status = $2::processing_status)
      AND ($3::uuid IS NULL OR pj.mock_test_id = $3::uuid)
    ORDER BY pj.created_at DESC
    `,
    [req.workspaceId, status, mockTestId],
  );

  res.json({ jobs: result.rows });
}));

processingJobsRouter.get('/:jobId', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
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
    WHERE pj.id = $1
      AND pj.workspace_id = $2
    `,
    [req.params.jobId, req.workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Processing job not found');
  }

  res.json({ job: result.rows[0] });
}));

processingJobsRouter.patch('/:jobId', asyncHandler(async (req, res) => {
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
      req.params.jobId,
      req.workspaceId,
      req.body.status || null,
      req.body.currentStage !== undefined,
      req.body.currentStage || null,
      req.body.progressPercent ?? null,
      req.body.outputSummary || null,
      req.body.errorMessage !== undefined,
      req.body.errorMessage || null,
    ],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Processing job not found');
  }

  const job = result.rows[0];

  await pool.query(
    `
    INSERT INTO processing_job_events (job_id, stage, message, payload)
    VALUES ($1, $2, $3, $4)
    `,
    [
      job.id,
      job.current_stage || job.status,
      `Job updated to ${job.status}`,
      {
        status: job.status,
        progressPercent: job.progress_percent,
      },
    ],
  );

  res.json({ job });
}));
