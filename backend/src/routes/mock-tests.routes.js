import { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/async-handler.js';
import { buildStorageKey, ensureUploadDir } from '../lib/file-storage.js';
import { httpError } from '../lib/http-error.js';
import { optionalNumber, optionalString, requiredString } from '../lib/validators.js';
import { startWorkerOnce } from '../lib/worker-runner.js';

export const mockTestsRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    async destination(req, _file, callback) {
      try {
        const targetDir = await ensureUploadDir(req.workspaceId, req.params.mockTestId);
        callback(null, targetDir);
      } catch (error) {
        callback(error);
      }
    },
    filename(_req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase() || '.pdf';
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter(_req, file, callback) {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      path.extname(file.originalname).toLowerCase() === '.pdf';

    if (!isPdf) {
      callback(httpError(400, 'Only PDF files are supported'));
      return;
    }

    callback(null, true);
  },
});

async function assertMockTestAccess(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    SELECT mt.*
    FROM mock_tests mt
    WHERE mt.id = $1
      AND mt.workspace_id = $2
    `,
    [mockTestId, workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Mock test not found');
  }

  return result.rows[0];
}

mockTestsRouter.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    SELECT
      mt.*,
      c.name AS cluster_name
    FROM mock_tests mt
    JOIN clusters c ON c.id = mt.cluster_id
    WHERE mt.workspace_id = $1
    ORDER BY mt.created_at DESC
    `,
    [req.workspaceId],
  );

  res.json({ mockTests: result.rows });
}));

mockTestsRouter.get('/:mockTestId', asyncHandler(async (req, res) => {
  const mockTest = await assertMockTestAccess(req.params.mockTestId, req.workspaceId);
  res.json({ mockTest });
}));

mockTestsRouter.patch('/:mockTestId', asyncHandler(async (req, res) => {
  const name = req.body.name === undefined ? undefined : requiredString(req.body.name, 'name');
  const description = req.body.description === undefined ? undefined : optionalString(req.body.description);
  const status = req.body.status || null;

  const result = await pool.query(
    `
    UPDATE mock_tests
    SET
      name = COALESCE($3, name),
      description = CASE WHEN $4::boolean THEN $5 ELSE description END,
      exam_year = CASE WHEN $6::boolean THEN $7 ELSE exam_year END,
      duration_minutes = COALESCE($8, duration_minutes),
      marks_per_correct = COALESCE($9, marks_per_correct),
      negative_marks_per_wrong = COALESCE($10, negative_marks_per_wrong),
      status = COALESCE($11::mock_test_status, status),
      published_at = CASE
        WHEN $11 = 'published' THEN COALESCE(published_at, now())
        ELSE published_at
      END
    WHERE id = $1
      AND workspace_id = $2
    RETURNING *
    `,
    [
      req.params.mockTestId,
      req.workspaceId,
      name || null,
      req.body.description !== undefined,
      description,
      req.body.examYear !== undefined,
      req.body.examYear ?? null,
      optionalNumber(req.body.durationMinutes, null),
      optionalNumber(req.body.marksPerCorrect, null),
      optionalNumber(req.body.negativeMarksPerWrong, null),
      status,
    ],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Mock test not found');
  }

  res.json({ mockTest: result.rows[0] });
}));

mockTestsRouter.post('/:mockTestId/publish', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    UPDATE mock_tests
    SET status = 'published',
        published_at = COALESCE(published_at, now())
    WHERE id = $1
      AND workspace_id = $2
    RETURNING *
    `,
    [req.params.mockTestId, req.workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Mock test not found');
  }

  res.json({ mockTest: result.rows[0] });
}));

mockTestsRouter.delete('/:mockTestId', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    DELETE FROM mock_tests
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [req.params.mockTestId, req.workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Mock test not found');
  }

  res.status(204).send();
}));

mockTestsRouter.post('/:mockTestId/upload', upload.single('document'), asyncHandler(async (req, res) => {
  const mockTest = await assertMockTestAccess(req.params.mockTestId, req.workspaceId);

  if (!req.file) {
    throw httpError(400, 'PDF document is required');
  }

  const storageKey = buildStorageKey(req.workspaceId, req.params.mockTestId, req.file.filename);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fileResult = await client.query(
      `
      INSERT INTO uploaded_files (
        workspace_id,
        mock_test_id,
        uploaded_by,
        original_filename,
        storage_key,
        mime_type,
        file_size_bytes,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        req.workspaceId,
        mockTest.id,
        req.user.id,
        req.file.originalname,
        storageKey,
        req.file.mimetype || 'application/pdf',
        req.file.size,
        {
          localPath: req.file.path,
          uploadedVia: 'mock-test-create-modal',
        },
      ],
    );

    const jobResult = await client.query(
      `
      INSERT INTO processing_jobs (
        workspace_id,
        mock_test_id,
        uploaded_file_id,
        requested_by,
        status,
        current_stage,
        progress_percent,
        input_config
      )
      VALUES ($1, $2, $3, $4, 'queued', 'Waiting for OCR worker', 0, $5)
      RETURNING *
      `,
      [
        req.workspaceId,
        mockTest.id,
        fileResult.rows[0].id,
        req.user.id,
        {
          originalFilename: req.file.originalname,
          storageKey,
        },
      ],
    );

    await client.query(
      `
      INSERT INTO processing_job_events (job_id, stage, message, payload)
      VALUES ($1, 'queued', 'PDF uploaded and processing job queued', $2)
      `,
      [
        jobResult.rows[0].id,
        {
          uploadedFileId: fileResult.rows[0].id,
          originalFilename: req.file.originalname,
        },
      ],
    );

    const mockTestResult = await client.query(
      `
      UPDATE mock_tests
      SET status = 'processing'
      WHERE id = $1
        AND workspace_id = $2
      RETURNING *
      `,
      [mockTest.id, req.workspaceId],
    );

    await client.query('COMMIT');

    const worker = startWorkerOnce();

    res.status(201).json({
      uploadedFile: fileResult.rows[0],
      processingJob: jobResult.rows[0],
      mockTest: mockTestResult.rows[0],
      worker,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

mockTestsRouter.post('/:mockTestId/reprocess', asyncHandler(async (req, res) => {
  const mockTest = await assertMockTestAccess(req.params.mockTestId, req.workspaceId);

  const fileResult = await pool.query(
    `
    SELECT *
    FROM uploaded_files
    WHERE mock_test_id = $1
      AND workspace_id = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [mockTest.id, req.workspaceId],
  );

  if (fileResult.rowCount === 0) {
    throw httpError(400, 'Upload a PDF before reprocessing this mock test');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const jobResult = await client.query(
      `
      INSERT INTO processing_jobs (
        workspace_id,
        mock_test_id,
        uploaded_file_id,
        requested_by,
        status,
        current_stage,
        progress_percent,
        input_config
      )
      VALUES ($1, $2, $3, $4, 'queued', 'Waiting for OCR worker', 0, $5)
      RETURNING *
      `,
      [
        req.workspaceId,
        mockTest.id,
        fileResult.rows[0].id,
        req.user.id,
        {
          originalFilename: fileResult.rows[0].original_filename,
          storageKey: fileResult.rows[0].storage_key,
          reprocess: true,
        },
      ],
    );

    await client.query(
      `
      INSERT INTO processing_job_events (job_id, stage, message, payload)
      VALUES ($1, 'queued', 'PDF reprocessing job queued', $2)
      `,
      [
        jobResult.rows[0].id,
        {
          uploadedFileId: fileResult.rows[0].id,
          originalFilename: fileResult.rows[0].original_filename,
        },
      ],
    );

    const mockTestResult = await client.query(
      `
      UPDATE mock_tests
      SET status = 'processing'
      WHERE id = $1
        AND workspace_id = $2
      RETURNING *
      `,
      [mockTest.id, req.workspaceId],
    );

    await client.query('COMMIT');

    const worker = startWorkerOnce();

    res.status(201).json({
      processingJob: jobResult.rows[0],
      mockTest: mockTestResult.rows[0],
      worker,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

mockTestsRouter.get('/:mockTestId/questions', asyncHandler(async (req, res) => {
  await assertMockTestAccess(req.params.mockTestId, req.workspaceId);

  const result = await pool.query(
    `
    SELECT
      q.*,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'optionIndex', qo.option_index,
            'optionText', qo.option_text
          )
          ORDER BY qo.option_index
        ) FILTER (WHERE qo.id IS NOT NULL),
        '[]'::jsonb
      ) AS options
    FROM questions q
    LEFT JOIN question_options qo ON qo.question_id = q.id
    WHERE q.mock_test_id = $1
      AND q.workspace_id = $2
    GROUP BY q.id
    ORDER BY q.question_no ASC
    `,
    [req.params.mockTestId, req.workspaceId],
  );

  res.json({ questions: result.rows });
}));

mockTestsRouter.get('/:mockTestId/play', asyncHandler(async (req, res) => {
  const mockTest = await assertMockTestAccess(req.params.mockTestId, req.workspaceId);

  const questionsResult = await pool.query(
    `
    SELECT *
    FROM practice_jeca_questions
    WHERE mock_test_id = $1
    ORDER BY "questionNo" ASC
    `,
    [req.params.mockTestId],
  );

  res.json({
    mockTest: {
      id: mockTest.id,
      name: mockTest.name,
      description: mockTest.description,
      durationMinutes: mockTest.duration_minutes,
      marksPerCorrect: Number(mockTest.marks_per_correct),
      negativeMarking: Number(mockTest.negative_marks_per_wrong),
      totalQuestions: mockTest.total_questions,
      status: mockTest.status,
    },
    questions: questionsResult.rows.map((question) => ({
      questionNo: question.questionNo,
      topic: question.topic,
      text: question.text,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      questionType: question.questionType,
      explanation: question.explanation,
    })),
  });
}));
