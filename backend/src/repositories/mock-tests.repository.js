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
    settingsProvided,
    settings,
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
      is_catalog_listed = CASE WHEN $12::boolean THEN $13 ELSE is_catalog_listed END,
      settings = CASE
        WHEN $14::boolean THEN COALESCE(settings, '{}'::jsonb) || $15::jsonb
        ELSE settings
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
      isCatalogListedProvided,
      isCatalogListed,
      Boolean(settingsProvided),
      settings ? JSON.stringify(settings) : "{}",
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
      explanation,
      "marksPerCorrect",
      "negativeMarksPerWrong"
    FROM playable_mock_test_questions
    WHERE mock_test_id = $1
      AND ($2::text[] IS NULL OR topic = ANY($2::text[]))
    ORDER BY "questionNo" ASC
    `,
    [mockTestId, topics && topics.length ? topics : null],
  );

  return result.rows;
}

// "Generate from existing tests" feature. Validates every id belongs to
// this workspace as part of the same query that fetches them - a stray
// id from another workspace is silently dropped from the result rather
// than surfacing as its own error, so the caller (mock-tests.service.js)
// checks the returned row count against the requested id count to catch
// that case with a real error message instead.
export async function findMockTestsByIds(mockTestIds, workspaceId) {
  const result = await pool.query(
    `
    SELECT id, name
    FROM mock_tests
    WHERE id = ANY($1::uuid[])
      AND workspace_id = $2
    `,
    [mockTestIds, workspaceId],
  );

  return result.rows;
}

// The statistical shape the generation prompt is built from - topic,
// subtopic, question type, and the marking scheme that's most common for
// that combination. Deliberately NOT selecting question_text/options/
// explanation here: this whole feature exists to avoid feeding the AI
// (and paying tokens for) the source questions themselves, only their
// aggregate shape. mode() WITHIN GROUP picks the most common marks value
// per group rather than an average - marks_per_correct is almost always
// one of a few round numbers (1, 2, 4), and an average across a mixed
// group could land on a value no real question ever actually used (e.g.
// 2.5), which mode() never can.
export async function getTopicDistributionForMockTests(mockTestIds) {
  const result = await pool.query(
    `
    SELECT
      qc.topic,
      qc.subtopic,
      qc.question_type,
      count(*)::int AS question_count,
      mode() WITHIN GROUP (ORDER BY qc.marks_per_correct) AS typical_marks_per_correct,
      mode() WITHIN GROUP (ORDER BY qc.negative_marks_per_wrong) AS typical_negative_marks_per_wrong
    FROM question_contents qc
    JOIN questions q ON q.content_id = qc.id
    WHERE q.mock_test_id = ANY($1::uuid[])
      AND q.status <> 'rejected'
    GROUP BY qc.topic, qc.subtopic, qc.question_type
    ORDER BY question_count DESC
    `,
    [mockTestIds],
  );

  return result.rows;
}

export async function insertGenerationSources(
  client,
  mockTestId,
  sourceMockTestIds,
) {
  if (sourceMockTestIds.length === 0) return;

  const values = sourceMockTestIds
    .map((_, index) => `($1, $${index + 2})`)
    .join(", ");

  await client.query(
    `INSERT INTO mock_test_generation_sources (mock_test_id, source_mock_test_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [mockTestId, ...sourceMockTestIds],
  );
}

// Finds every mock test previously generated from EXACTLY this same set of
// source mock tests (order-independent - same set, not a superset/subset
// match) - lets generateFromExisting see which topic/subtopic/type groups
// earlier generations from this exact source pool already covered, so a
// repeat generation can prefer whichever groups haven't been touched yet
// instead of scaleDistributionToTarget's old fully-deterministic tie-break
// picking the identical subset every single time (see that function).
//
// Deliberately keyed on the EXACT source set via array equality, not "any
// generation ever done in this workspace" - swapping even one source test
// starts a fresh rotation, matching the intuitive mental model ("I've
// covered topics X, Y from THIS pool") rather than one giant workspace-wide
// counter that would conflate generations drawn from unrelated pools.
//
// Deliberately does NOT write or maintain any new tracking table - "usage"
// is derived live from real generated mock tests' own topic distributions
// (getTopicDistributionForMockTests, called by the service layer on
// whatever ids this returns), so it can never drift out of sync the way a
// separate counter incremented alongside generation could.
export async function findMockTestsGeneratedFromSameSourceSet(
  sourceMockTestIds,
) {
  if (sourceMockTestIds.length === 0) return [];

  const sortedSourceIds = [...sourceMockTestIds].sort();

  const result = await pool.query(
    `
    SELECT mock_test_id
    FROM mock_test_generation_sources
    GROUP BY mock_test_id
    HAVING array_agg(source_mock_test_id ORDER BY source_mock_test_id) = $1::uuid[]
    `,
    [sortedSourceIds],
  );

  return result.rows.map((row) => row.mock_test_id);
}

export async function listGenerationSources(mockTestId) {
  const result = await pool.query(
    `
    SELECT mt.id, mt.name
    FROM mock_test_generation_sources mtgs
    JOIN mock_tests mt ON mt.id = mtgs.source_mock_test_id
    WHERE mtgs.mock_test_id = $1
    ORDER BY mt.name ASC
    `,
    [mockTestId],
  );

  return result.rows;
}
