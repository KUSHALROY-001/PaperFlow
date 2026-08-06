import { pool } from "../db/pool.js";

export async function listMockTests(workspaceId) {
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
    [workspaceId],
  );

  return result.rows;
}

export async function findMockTestById(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    SELECT mt.*
    FROM mock_tests mt
    WHERE mt.id = $1
      AND mt.workspace_id = $2
    `,
    [mockTestId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function updateMockTest(mockTestId, workspaceId, fields) {
  const {
    name,
    descriptionProvided,
    description,
    examYearProvided,
    examYear,
    durationMinutes,
    marksPerCorrect,
    negativeMarksPerWrong,
    status,
  } = fields;

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
      mockTestId,
      workspaceId,
      name || null,
      descriptionProvided,
      description,
      examYearProvided,
      examYear,
      durationMinutes,
      marksPerCorrect,
      negativeMarksPerWrong,
      status,
    ],
  );

  return result.rows[0] || null;
}

export async function publishMockTest(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    UPDATE mock_tests
    SET status = 'published',
        published_at = COALESCE(published_at, now())
    WHERE id = $1
      AND workspace_id = $2
    RETURNING *
    `,
    [mockTestId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function setMockTestStatus(
  mockTestId,
  workspaceId,
  status,
  client = pool,
) {
  const result = await client.query(
    `
    UPDATE mock_tests
    SET status = $3
    WHERE id = $1
      AND workspace_id = $2
    RETURNING *
    `,
    [mockTestId, workspaceId, status],
  );

  return result.rows[0] || null;
}

export async function deleteMockTest(mockTestId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM mock_tests WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [mockTestId, workspaceId],
  );

  return result.rowCount > 0;
}

export async function insertUploadedFile(
  client,
  {
    workspaceId,
    mockTestId,
    uploadedBy,
    originalFilename,
    storageKey,
    mimeType,
    fileSizeBytes,
    metadata,
  },
) {
  const result = await client.query(
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
      workspaceId,
      mockTestId,
      uploadedBy,
      originalFilename,
      storageKey,
      mimeType,
      fileSizeBytes,
      metadata,
    ],
  );

  return result.rows[0];
}

export async function findLatestUploadedFile(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    SELECT *
    FROM uploaded_files
    WHERE mock_test_id = $1
      AND workspace_id = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [mockTestId, workspaceId],
  );

  return result.rows[0] || null;
}

// All uploaded_files rows for a mock test, used to clean up disk files on delete.
export async function listUploadedFilesForMockTest(mockTestId, workspaceId) {
  const result = await pool.query(
    "SELECT * FROM uploaded_files WHERE mock_test_id = $1 AND workspace_id = $2",
    [mockTestId, workspaceId],
  );

  return result.rows;
}

export async function insertProcessingJob(
  client,
  { workspaceId, mockTestId, uploadedFileId, requestedBy, inputConfig },
) {
  const result = await client.query(
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
    [workspaceId, mockTestId, uploadedFileId, requestedBy, inputConfig],
  );

  return result.rows[0];
}

export async function insertProcessingJobEvent(
  client,
  { jobId, stage, message, payload },
) {
  await client.query(
    `
    INSERT INTO processing_job_events (job_id, stage, message, payload)
    VALUES ($1, $2, $3, $4)
    `,
    [jobId, stage, message, payload],
  );
}

export async function listQuestionsWithOptions(mockTestId, workspaceId) {
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
    [mockTestId, workspaceId],
  );

  return result.rows;
}

export async function listPlayableQuestions(mockTestId) {
  const result = await pool.query(
    `
    SELECT
      "questionId",
      mock_test_id,
      "questionNo",
      topic,
      text,
      options,
      "correctOptionIndex",
      "questionType",
      explanation
    FROM playable_mock_test_questions
    WHERE mock_test_id = $1
    ORDER BY "questionNo" ASC
    `,
    [mockTestId],
  );

  return result.rows;
}
