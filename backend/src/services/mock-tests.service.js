import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import {
  buildStorageKey,
  deleteFileByPath,
  deleteMockTestUploadDir,
} from "../lib/file-storage.js";
import {
  optionalNumber,
  optionalString,
  requiredString,
} from "../lib/validators.js";
import { startWorkerOnce } from "../lib/worker-runner.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import {
  attachDiagramUrls,
  attachDiagramSource,
} from "./question-assets.service.js";

export async function listMockTests(workspaceId) {
  return mockTestsRepo.listMockTests(workspaceId);
}

export async function getMockTestOrFail(mockTestId, workspaceId) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );

  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  return mockTest;
}

// Backs MockTestDetailModal.jsx (components/cluster) - the details-card
// shown when a viewer/student clicks a MockTestCard.jsx, mirroring the
// public catalog's MockTestDetailModal.jsx (components/catalog) but for
// an already-authenticated same-workspace member. Deliberately returns
// only summary fields + topic counts, never the questions themselves
// (options, correct answers) - unlike listQuestions below, which an
// editor's OverviewTab/ReviewTab need full question content for, this is
// a pre-attempt preview a student sees before starting, so it must not
// leak anything a session itself wouldn't show upfront.
export async function getMockTestSummary(mockTestId, workspaceId) {
  const mockTest = await getMockTestOrFail(mockTestId, workspaceId);
  const topics = await mockTestsRepo.getMockTestTopicCounts(mockTestId);
  return { ...mockTest, topics };
}

// Was written by generateFromExisting (mock_test_generation_sources -
// migration 034) but never read back anywhere until now - a mock test
// generated from other tests' metadata had no way to show "Generated
// from: X, Y, Z" on its own page, which is the entire reason that table
// exists (pure provenance/display data, see the migration's own header
// comment). getMockTestOrFail first so a mockTestId from another
// workspace 404s here the same way every other mock-test-scoped route
// already does, rather than leaking an empty array for a test that was
// never this workspace's to begin with.
export async function getGenerationSources(mockTestId, workspaceId) {
  await getMockTestOrFail(mockTestId, workspaceId);
  return mockTestsRepo.listGenerationSources(mockTestId);
}

export async function updateMockTest(mockTestId, workspaceId, body) {
  const name =
    body.name === undefined ? undefined : requiredString(body.name, "name");
  const descriptionProvided = body.description !== undefined;
  const description = optionalString(body.description);
  const examYearProvided = body.examYear !== undefined;
  const examYear = body.examYear ?? null;
  const status = body.status || null;
  const isCatalogListedProvided = body.isCatalogListed !== undefined;
  const isCatalogListed = Boolean(body.isCatalogListed);

  let mockTest;
  try {
    mockTest = await mockTestsRepo.updateMockTest(mockTestId, workspaceId, {
      name,
      descriptionProvided,
      description,
      examYearProvided,
      examYear,
      durationMinutes: optionalNumber(body.durationMinutes, null),
      marksPerCorrect: optionalNumber(body.marksPerCorrect, null),
      negativeMarksPerWrong: optionalNumber(body.negativeMarksPerWrong, null),
      status,
      isCatalogListedProvided,
      isCatalogListed,
    });
  } catch (error) {
    // 23505 = unique_violation, from the (cluster_id, name) constraint -
    // hit when renaming a mock test to a name another one in the same
    // cluster already has.
    if (error.code === "23505") {
      throw httpError(
        409,
        name
          ? `A mock test named "${name}" already exists in this cluster`
          : "A mock test with this name already exists in this cluster",
      );
    }
    throw error;
  }

  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  return mockTest;
}

export async function publishMockTest(mockTestId, workspaceId) {
  const mockTest = await mockTestsRepo.publishMockTest(mockTestId, workspaceId);

  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  return mockTest;
}

// Deleting a mock test cascades its uploaded_files/processing_jobs/questions
// rows at the DB level, but the actual PDF files on disk are not touched by
// Postgres. Clean the upload directory up ourselves.
export async function deleteMockTest(mockTestId, workspaceId) {
  const deleted = await mockTestsRepo.deleteMockTest(mockTestId, workspaceId);

  if (!deleted) {
    throw httpError(404, "Mock test not found");
  }

  await deleteMockTestUploadDir(workspaceId, mockTestId);
}

// The only two values the worker understands (worker/ai/provider.py reads
// this same string from processing_jobs.input_config.documentType). Kept as
// a small local list rather than pulling in a shared enum helper - promote
// this alongside requiredEnum if/when validators.js gains one.
const DOCUMENT_TYPES = ["questions", "notes"];

function normalizeDocumentType(value) {
  if (value === undefined || value === null || value === "") {
    return "questions";
  }
  if (!DOCUMENT_TYPES.includes(value)) {
    throw httpError(
      400,
      `documentType must be one of: ${DOCUMENT_TYPES.join(", ")}`,
    );
  }
  return value;
}

// Pulled out of mockTest.settings (snapshotted at apply time - see
// applyTemplate in extraction-templates.service.js) rather than re-fetched
// from extraction_templates here, so a job always reflects the template as
// it was when the user actually applied it, not whatever it looks like by
// upload time. Returns undefined (not stripped keys) when this mock test
// wasn't created from a template, so it's easy to spread away cleanly in
// inputConfig without leaving a stray `templateContext: undefined` unless
// there really is one.
function buildTemplateContext(mockTest) {
  const settings = mockTest.settings || {};
  if (!settings.templateId) {
    return undefined;
  }

  // As of 010_extraction_templates_syllabus.sql, settings.sections holds
  // structured objects ({ name, topics, questionCount?, marksPerCorrect?,
  // negativeMarksPerWrong? }) snapshotted at apply time by applyTemplate in
  // extraction-templates.service.js - not the flat topic-name strings this
  // used to be. Keep both shapes usable here: flatten topics across all
  // sections for a plain syllabus list, and pass the structured sections
  // through too so a per-section marking scheme survives (see Phase 4 -
  // question-level marks aren't applied from this yet, but the data should
  // already be there when that lands rather than needing another snapshot
  // migration).
  const sections = Array.isArray(settings.sections) ? settings.sections : [];
  const syllabusTopics = [
    ...new Set(
      sections.flatMap((section) =>
        Array.isArray(section?.topics) ? section.topics : [],
      ),
    ),
  ];

  return {
    templateId: settings.templateId,
    templateName: settings.templateName ?? null,
    sections,
    syllabusTopics,
    expectedQuestionCount: settings.expectedQuestionCount ?? null,
    marksPerCorrect: mockTest.marks_per_correct ?? null,
    negativeMarksPerWrong: mockTest.negative_marks_per_wrong ?? null,
  };
}

// Shared by both the fresh-upload flow and the reprocess flow: insert a
// processing_jobs row + its first event + flip the mock test to "processing",
// all in one transaction, then kick the worker.
async function queueProcessingJob({
  mockTest,
  workspaceId,
  uploadedFileId,
  requestedBy,
  originalFilename,
  storageKey,
  documentType,
  extraInputConfig = {},
}) {
  const client = await pool.connect();
  const templateContext = buildTemplateContext(mockTest);

  try {
    await client.query("BEGIN");

    // A mock test must never have two jobs racing to write its questions -
    // reprocessing (or, in principle, a second upload) while a job is
    // still queued/running now supersedes it instead of running alongside
    // it. See mock-tests.repository.js#cancelActiveProcessingJobs for how
    // an already-executing worker process notices and stops.
    const cancelledJobs = await mockTestsRepo.cancelActiveProcessingJobs(
      client,
      { mockTestId: mockTest.id, workspaceId },
    );

    for (const cancelledJob of cancelledJobs) {
      await mockTestsRepo.insertProcessingJobEvent(client, {
        jobId: cancelledJob.id,
        stage: "cancelled",
        message: "Cancelled - superseded by a new processing job",
      });
    }

    const job = await mockTestsRepo.insertProcessingJob(client, {
      workspaceId,
      mockTestId: mockTest.id,
      uploadedFileId,
      requestedBy,
      inputConfig: {
        originalFilename,
        storageKey,
        documentType,
        ...(templateContext ? { templateContext } : {}),
        ...extraInputConfig,
      },
    });

    await mockTestsRepo.insertProcessingJobEvent(client, {
      jobId: job.id,
      stage: "queued",
      message: extraInputConfig.reprocess
        ? "PDF reprocessing job queued"
        : "PDF uploaded and processing job queued",
      payload: { uploadedFileId, originalFilename },
    });

    const updatedMockTest = await mockTestsRepo.setMockTestStatus(
      mockTest.id,
      workspaceId,
      "processing",
      client,
    );

    await client.query("COMMIT");

    const worker = startWorkerOnce();

    return { processingJob: job, mockTest: updatedMockTest, worker };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Scales a raw topic/subtopic/type breakdown (whatever total question
// count the selected source tests happen to add up to) down or up to sum
// to EXACTLY targetCount. Naive proportional rounding (Math.round on each
// group independently) doesn't guarantee the rounded values sum back to
// the target - the largest-remainder method does: take each group's
// floor, then hand out the few leftover slots to the groups with the
// largest fractional remainder, largest first. If targetCount is smaller
// than the number of distinct topic/subtopic/type groups, some groups
// legitimately end up with 0 and are dropped - there's no other sane way
// to fit more groups than the target has room for.
function scaleDistributionToTarget(rows, targetCount) {
  const totalQuestions = rows.reduce((sum, row) => sum + row.question_count, 0);
  const scaled = rows.map((row) => {
    const exact = (row.question_count / totalQuestions) * targetCount;
    const floor = Math.floor(exact);
    return { ...row, count: floor, remainder: exact - floor };
  });

  const assigned = scaled.reduce((sum, row) => sum + row.count, 0);
  let remaining = targetCount - assigned;

  const byRemainderDesc = [...scaled].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < byRemainderDesc.length && remaining > 0; i += 1) {
    byRemainderDesc[i].count += 1;
    remaining -= 1;
  }

  return scaled
    .filter((row) => row.count > 0)
    .map((row) => ({
      topic: row.topic,
      subtopic: row.subtopic,
      questionType: row.question_type,
      count: row.count,
      marksPerCorrect: row.typical_marks_per_correct,
      negativeMarksPerWrong: row.typical_negative_marks_per_wrong,
    }));
}

const MIN_GENERATED_QUESTIONS = 5;
const MAX_GENERATED_QUESTIONS = 200;
const DIFFICULTY_HINTS = ["Easy", "Medium", "Hard", "Variable"];

// "Generate from existing tests": no PDF, no OCR, no text extraction - the
// AI is given only the STATISTICAL SHAPE of the selected source tests
// (topic/subtopic/question-type distribution, marking scheme - see
// getTopicDistributionForMockTests), never the source questions' actual
// text. That's a deliberate choice, not a shortcut: it keeps token cost
// proportional to the OUTPUT question count only regardless of how many
// or how large the source tests are, and it means the AI structurally
// can't reproduce a source question, since it never sees one.
//
// Reuses queueProcessingJob (the private helper just above) exactly the
// way uploadDocument below does - same processing_jobs row shape, same
// worker-kick, same "processing" status flip. uploadedFileId is null
// here (processing_jobs.uploaded_file_id has always been nullable - see
// migration 034's header for the one real gap this exposed, in
// worker/db.py's job-claiming query, fixed alongside this feature).
export async function generateFromExisting({
  mockTest,
  workspaceId,
  userId,
  sourceMockTestIds,
  targetQuestionCount,
  difficultyHint,
}) {
  if (!Array.isArray(sourceMockTestIds) || sourceMockTestIds.length === 0) {
    throw httpError(400, "Select at least one source mock test");
  }
  const uniqueSourceIds = [...new Set(sourceMockTestIds)];

  const count = Math.round(Number(targetQuestionCount));
  if (
    !Number.isFinite(count) ||
    count < MIN_GENERATED_QUESTIONS ||
    count > MAX_GENERATED_QUESTIONS
  ) {
    throw httpError(
      400,
      `targetQuestionCount must be between ${MIN_GENERATED_QUESTIONS} and ${MAX_GENERATED_QUESTIONS}`,
    );
  }

  const normalizedDifficultyHint = difficultyHint || "Variable";
  if (!DIFFICULTY_HINTS.includes(normalizedDifficultyHint)) {
    throw httpError(
      400,
      `difficultyHint must be one of: ${DIFFICULTY_HINTS.join(", ")}`,
    );
  }

  // Every id must actually belong to this workspace - findMockTestsByIds
  // silently drops any id that doesn't match, so a returned-row-count
  // mismatch against what was requested is how a stray/foreign id gets
  // caught, rather than silently generating from fewer sources than the
  // caller thought they'd selected.
  const sources = await mockTestsRepo.findMockTestsByIds(
    uniqueSourceIds,
    workspaceId,
  );
  if (sources.length !== uniqueSourceIds.length) {
    throw httpError(
      400,
      "One or more selected mock tests weren't found in this workspace",
    );
  }

  const distributionRows =
    await mockTestsRepo.getTopicDistributionForMockTests(uniqueSourceIds);
  if (distributionRows.length === 0) {
    throw httpError(
      400,
      "The selected mock tests have no questions to base a generation on",
    );
  }

  const topicDistribution = scaleDistributionToTarget(distributionRows, count);

  await mockTestsRepo.insertGenerationSources(
    pool,
    mockTest.id,
    uniqueSourceIds,
  );

  const {
    processingJob,
    mockTest: updatedMockTest,
    worker,
  } = await queueProcessingJob({
    mockTest,
    workspaceId,
    uploadedFileId: null,
    requestedBy: userId,
    originalFilename: null,
    storageKey: null,
    documentType: "generate_from_existing",
    extraInputConfig: {
      sourceMockTestIds: uniqueSourceIds,
      targetQuestionCount: count,
      difficultyHint: normalizedDifficultyHint,
      topicDistribution,
    },
  });

  return { processingJob, mockTest: updatedMockTest, worker };
}

export async function uploadDocument({
  mockTest,
  workspaceId,
  userId,
  file,
  documentType,
}) {
  if (!file) {
    throw httpError(400, "PDF document is required");
  }

  const normalizedDocumentType = normalizeDocumentType(documentType);
  const storageKey = buildStorageKey(workspaceId, mockTest.id, file.filename);
  const client = await pool.connect();

  let uploadedFile;
  try {
    await client.query("BEGIN");

    uploadedFile = await mockTestsRepo.insertUploadedFile(client, {
      workspaceId,
      mockTestId: mockTest.id,
      uploadedBy: userId,
      originalFilename: file.originalname,
      storageKey,
      mimeType: file.mimetype || "application/pdf",
      fileSizeBytes: file.size,
      metadata: {
        localPath: file.path,
        uploadedVia: "mock-test-create-modal",
        documentType: normalizedDocumentType,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    // The file already landed on disk via multer before this transaction ran.
    // If the DB insert failed, don't leave an orphaned PDF behind.
    await deleteFileByPath(file.path);
    throw error;
  } finally {
    client.release();
  }

  const {
    processingJob,
    mockTest: updatedMockTest,
    worker,
  } = await queueProcessingJob({
    mockTest,
    workspaceId,
    uploadedFileId: uploadedFile.id,
    requestedBy: userId,
    originalFilename: file.originalname,
    storageKey,
    documentType: normalizedDocumentType,
  });

  return { uploadedFile, processingJob, mockTest: updatedMockTest, worker };
}

// The reprocess button becomes a Cancel button while a job is queued/
// running (see MockTestWorkspace.jsx) precisely so this is the only way
// to get a second reprocess in while one is active - the user cancels
// first, explicitly, rather than a new reprocess silently superseding an
// in-flight one (which queueProcessingJob's cancelActiveProcessingJobs
// call would still handle safely, but this makes it a deliberate action
// instead of an implicit side effect).
export async function cancelProcessing({ mockTest, workspaceId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cancelledJobs = await mockTestsRepo.cancelActiveProcessingJobs(
      client,
      { mockTestId: mockTest.id, workspaceId },
    );

    if (cancelledJobs.length === 0) {
      throw httpError(
        400,
        "This mock test has no active processing job to cancel",
      );
    }

    for (const cancelledJob of cancelledJobs) {
      await mockTestsRepo.insertProcessingJobEvent(client, {
        jobId: cancelledJob.id,
        stage: "cancelled",
        message: "Cancelled by user",
      });
    }

    // total_questions is trigger-maintained on the questions table (see
    // migrations/001_initial_schema.sql) so it's already accurate on the
    // mockTest snapshot loaded for this request - cancelling never
    // touches questions itself, so there's nothing to re-query. Mirrors
    // worker/db.py#mark_mock_test_after_processing's own status logic: a
    // mock test that already had questions from an earlier successful run
    // goes back to "review" rather than being left on "processing"
    // forever; one that's never had any goes back to "draft".
    const nextStatus = mockTest.total_questions > 0 ? "review" : "draft";
    const updatedMockTest = await mockTestsRepo.setMockTestStatus(
      mockTest.id,
      workspaceId,
      nextStatus,
      client,
    );

    await client.query("COMMIT");

    return {
      mockTest: updatedMockTest,
      cancelledJobIds: cancelledJobs.map((job) => job.id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function reprocessMockTest({ mockTest, workspaceId, userId }) {
  const latestFile = await mockTestsRepo.findLatestUploadedFile(
    mockTest.id,
    workspaceId,
  );

  if (!latestFile) {
    throw httpError(400, "Upload a PDF before reprocessing this mock test");
  }

  // Reuse whatever documentType was chosen on the original upload, so the
  // user isn't asked "notes or questions?" again just to retry processing.
  // Older uploads made before this field existed have no metadata.documentType
  // at all - normalizeDocumentType's undefined-defaults-to-'questions'
  // behavior keeps those working exactly as they did before this change.
  const documentType = normalizeDocumentType(latestFile.metadata?.documentType);

  return queueProcessingJob({
    mockTest,
    workspaceId,
    uploadedFileId: latestFile.id,
    requestedBy: userId,
    originalFilename: latestFile.original_filename,
    storageKey: latestFile.storage_key,
    documentType,
    extraInputConfig: { reprocess: true },
  });
}

export async function listQuestions(mockTestId, workspaceId) {
  await getMockTestOrFail(mockTestId, workspaceId);
  const questions = await mockTestsRepo.listQuestionsWithOptions(
    mockTestId,
    workspaceId,
  );
  const withDiagrams = await attachDiagramUrls(questions, workspaceId, {
    idField: "id",
  });
  return attachDiagramSource(withDiagrams, { idField: "id" });
}

export async function getPlayableMockTest(mockTestId, workspaceId) {
  const mockTest = await getMockTestOrFail(mockTestId, workspaceId);
  const questions = await mockTestsRepo.listPlayableQuestions(mockTestId);

  return {
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
    // Deliberately NOT sending correctOptionIndex/explanation here - this
    // was leaking the answer key to anyone who called this endpoint before
    // submitting anything. Grading now happens server-side in
    // attempts.service.js#submitAttempt instead, which is also where the
    // answer key legitimately becomes visible (after submission).
    questions: questions.map((question) => ({
      questionId: question.questionId,
      questionNo: question.questionNo,
      topic: question.topic,
      text: question.text,
      options: question.options,
      questionType: question.questionType,
    })),
  };
}
