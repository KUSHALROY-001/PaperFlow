import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/async-handler.js';
import { httpError } from '../lib/http-error.js';
import { optionalString, requiredString } from '../lib/validators.js';

export const clustersRouter = Router();

clustersRouter.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    SELECT
      c.*,
      count(mt.id)::INT AS mock_test_count
    FROM clusters c
    LEFT JOIN mock_tests mt ON mt.cluster_id = c.id
    WHERE c.workspace_id = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC
    `,
    [req.workspaceId],
  );

  res.json({ clusters: result.rows });
}));

clustersRouter.post('/', asyncHandler(async (req, res) => {
  const name = requiredString(req.body.name, 'name');
  const description = optionalString(req.body.description);

  const result = await pool.query(
    `
    INSERT INTO clusters (workspace_id, created_by, name, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [req.workspaceId, req.user.id, name, description],
  );

  res.status(201).json({ cluster: result.rows[0] });
}));

clustersRouter.get('/:clusterId', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    SELECT *
    FROM clusters
    WHERE id = $1
      AND workspace_id = $2
    `,
    [req.params.clusterId, req.workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Cluster not found');
  }

  res.json({ cluster: result.rows[0] });
}));

clustersRouter.patch('/:clusterId', asyncHandler(async (req, res) => {
  const name = req.body.name === undefined ? undefined : requiredString(req.body.name, 'name');
  const description = req.body.description === undefined ? undefined : optionalString(req.body.description);

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
    [req.params.clusterId, req.workspaceId, name || null, req.body.description !== undefined, description],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Cluster not found');
  }

  res.json({ cluster: result.rows[0] });
}));

clustersRouter.delete('/:clusterId', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    DELETE FROM clusters
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [req.params.clusterId, req.workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Cluster not found');
  }

  res.status(204).send();
}));

clustersRouter.get('/:clusterId/mock-tests', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    SELECT mt.*
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE mt.cluster_id = $1
      AND c.workspace_id = $2
    ORDER BY mt.created_at DESC
    `,
    [req.params.clusterId, req.workspaceId],
  );

  res.json({ mockTests: result.rows });
}));

clustersRouter.post('/:clusterId/mock-tests', asyncHandler(async (req, res) => {
  const name = requiredString(req.body.name, 'name');
  const description = optionalString(req.body.description);
  const examYear = req.body.examYear ?? null;
  const durationMinutes = Number(req.body.durationMinutes || 120);
  const marksPerCorrect = Number(req.body.marksPerCorrect || 1);
  const negativeMarksPerWrong = Number(req.body.negativeMarksPerWrong ?? 0.25);

  const clusterResult = await pool.query(
    'SELECT id FROM clusters WHERE id = $1 AND workspace_id = $2',
    [req.params.clusterId, req.workspaceId],
  );

  if (clusterResult.rowCount === 0) {
    throw httpError(404, 'Cluster not found');
  }

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
      req.workspaceId,
      req.params.clusterId,
      req.user.id,
      name,
      description,
      examYear,
      durationMinutes,
      marksPerCorrect,
      negativeMarksPerWrong,
    ],
  );

  res.status(201).json({ mockTest: result.rows[0] });
}));
