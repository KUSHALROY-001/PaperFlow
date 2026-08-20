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
    isCatalogListedProvided,
    isCatalogListed,
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
      END,
      is_catalog_listed = CASE WHEN $12::boolean THEN $13 ELSE is_catalog_listed END
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
      isCatalogListedProvided,
      isCatalogListed,
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

// Called right before a new job is inserted for a mock test (fresh upload
// or reprocess) so a mock test can never have more than one job racing to
// write its questions. 'queued' jobs are simply superseded; 'running' jobs
// are also superseded here, in the DB, immediately - the worker process
// that's actually executing that job notices via its own cancellation
// checks (worker/db.py#is_job_cancelled) and stops short instead of
// finishing and overwriting whatever the new job produces. Excludes
// 'cancelled' itself so re-running this on a job that's already cancelled
// is a harmless no-op, not a duplicate cancellation event.
export async function cancelActiveProcessingJobs(
  client,
  { mockTestId, workspaceId },
) {
  const result = await client.query(
    `
    UPDATE processing_jobs
    SET status = 'cancelled',
        current_stage = 'Cancelled (superseded by a new processing job)',
        completed_at = COALESCE(completed_at, now())
    WHERE mock_test_id = $1
      AND workspace_id = $2
      AND status IN ('queued', 'running')
    RETURNING id
    `,
    [mockTestId, workspaceId],
  );

  return result.rows;
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
    // processing_job_events.payload is JSONB NOT NULL DEFAULT '{}' - but
    // that default only kicks in when the column is omitted from the
    // INSERT entirely. Passing an explicit SQL NULL (which `payload ??
    // {}` here prevents) bypasses the default and violates NOT NULL, as
    // opposed to passing the JS object {} itself, which pg serializes to
    // the jsonb value '{}' same as the default would.
    [jobId, stage, message, payload ?? {}],
  );
}

// Topic-wise question counts for a single mock test - the authenticated,
// same-workspace counterpart to catalog.repository.js#getCatalogMockTestTopics
// (that one serves public/unauthenticated catalog visitors; this one
// backs MockTestDetailModal.jsx's in-app version, opened from
// MockTestCard.jsx). Deliberately the same "no status filter" as
// playable_mock_test_questions (see migrations/017) and the catalog
// version - a student picking topics here should see counts that match
// what a session actually delivers, not a subset filtered by review
// status that the session itself doesn't filter by either.
export async function getMockTestTopicCounts(mockTestId) {
  const result = await pool.query(
    `
    SELECT topic, COUNT(*)::int AS count
    FROM questions
    WHERE mock_test_id = $1 AND topic IS NOT NULL
    GROUP BY topic
    ORDER BY topic ASC
    `,
    [mockTestId],
  );
  return result.rows;
}

export async function listQuestionsWithOptions(mockTestId, workspaceId) {
  const result = await pool.query(
    `
    SELECT q.*
    FROM questions q
    WHERE q.mock_test_id = $1
      AND q.workspace_id = $2
    ORDER BY q.question_no ASC
    `,
    [mockTestId, workspaceId],
  );

  return result.rows;
}

export async function listPlayableQuestions(mockTestId, topics) {
  const result = await pool.query(
    `
    SELECT
      "questionId",
      mock_test_id,
      "questionNo",
      topic,
      subtopic,
      passage,
      text,
      options,
      "correctOptionIndex",
      "questionType",
      explanation
    FROM playable_mock_test_questions
    WHERE mock_test_id = $1
      AND ($2::text[] IS NULL OR topic = ANY($2::text[]))
    ORDER BY "questionNo" ASC
    `,
    [mockTestId, topics && topics.length ? topics : null],
  );

  return result.rows;
}
