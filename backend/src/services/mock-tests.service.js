import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import {
  buildPdfStorageKey,
  deletePdf,
  uploadPdf,
  getPresignedUploadUrl,
  headPdf,
} from "../lib/pdf-storage.js";
import { deleteDiagram } from "../lib/cloudinary-storage.js";
import {
  optionalNumber,
  optionalString,
  requiredString,
} from "../lib/validators.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import {
  attachDiagramUrls,
  attachDiagramSource,
} from "./question-assets.service.js";
import { kickWorker } from "../lib/worker-runner.js";

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
// rows at the DB level, but the actual PDF (B2) and diagram (Cloudinary)
// objects those rows pointed at are not touched by Postgres. Clean those up
// ourselves.
export async function deleteMockTest(mockTestId, workspaceId) {
  // Collected BEFORE the delete below, not after - deleteMockTest cascades
  // (uploaded_files/questions/question_assets all reference mock_tests
  // with ON DELETE CASCADE), so the DB rows telling us which B2 objects
  // and Cloudinary assets belong to this mock test would already be gone
  // by the time we could ask. Remote cleanup below is best-effort and
  // happens after the cascade regardless - a mock test that's already
  // gone from the DB shouldn't be blocked from finishing its delete by a
  // slow/failed B2 or Cloudinary call.
  const [uploadedFiles, diagramAssets] = await Promise.all([
    mockTestsRepo.listUploadedFilesForMockTest(mockTestId, workspaceId),
    questionAssetsRepo.findAssetsForMockTest(mockTestId),
  ]);

  const deleted = await mockTestsRepo.deleteMockTest(mockTestId, workspaceId);

  if (!deleted) {
    throw httpError(404, "Mock test not found");
  }

  await Promise.all([
    ...uploadedFiles.map((file) => deletePdf(file.storage_key)),
    ...[...diagramAssets.values()].map((asset) =>
      deleteDiagram(asset.storagePath),
    ),
  ]);
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
// all in one transaction. After the commit, kicks the deployed Python
// worker service (see worker-runner.js#kickWorker) so the job is usually
// picked up within seconds rather than waiting for the next scheduled
// external ping - this is a best-effort latency optimization, not a
// requirement for correctness (see kickWorker's own comment).
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

    kickWorker({ jobId: job.id });

    return { processingJob: job, mockTest: updatedMockTest };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Scales a raw topic/subtopic/type breakdown (whatever total question
// count the selected source tests happen to add up to) down or up to sum
// to EXACTLY targetCount, while rotating which groups get picked across
// repeat generations from the same source pool instead of always landing
// on the same deterministic subset.
//
// The old version used pure largest-remainder rounding with no memory of
// past runs - fine for picking HOW a single call's target should be
// proportioned across groups, but with no randomness or history, it's
// fully deterministic: the same source + the same targetCount always
// produces the exact same scaled counts, tie-broken by array order, which
// never changes between calls either. Generate 50% from a 100-topic
// source four times and you'd get the identical ~50 topics every single
// time - confirmed as a real, reported bug, not a hypothetical.
//
// Replaced with a greedy, single-question-at-a-time allocator: repeatedly
// pick whichever eligible group has been used LEAST across (a) prior
// generations from this exact same source pool (usageRows, from
// findMockTestsGeneratedFromSameSourceSet + a second
// getTopicDistributionForMockTests call on those - see
// generateFromExisting below) and (b) this call so far. Ties break by the
// group's own source question_count (bigger/more-central topics
// preferred, keeping some of the original "respect topic weight" intent)
// and finally by topic/subtopic/type text for full determinism (no
// JS-engine-dependent ordering left to chance).
//
// Deliberately has NO hard per-group cap at that group's own source
// question_count - the old version supported requesting MORE than the
// source's total (e.g. targetCount=200 from a 100-question source scales
// every group up ~2x), and a hard cap here would silently break that. A
// group with a small source count just keeps participating in the same
// least-used-first rotation as everything else once its "first lap" is
// done, same as any other group.
function scaleDistributionToTarget(rows, targetCount, usageRows = []) {
  const keyFor = (row) =>
    `${row.topic}\u0000${row.subtopic || ""}\u0000${row.question_type}`;

  const usageByKey = new Map();
  for (const row of usageRows) {
    usageByKey.set(keyFor(row), row.question_count);
  }

  const pool = rows.map((row) => ({
    topic: row.topic,
    subtopic: row.subtopic,
    question_type: row.question_type,
    question_count: row.question_count,
    marksPerCorrect: row.typical_marks_per_correct,
    negativeMarksPerWrong: row.typical_negative_marks_per_wrong,
    key: keyFor(row),
    priorUsage: usageByKey.get(keyFor(row)) || 0,
    pickedThisCall: 0,
  }));

  for (let remaining = targetCount; remaining > 0; remaining -= 1) {
    let winner = pool[0];
    for (let i = 1; i < pool.length; i += 1) {
      const candidate = pool[i];
      const candidateUsage = candidate.priorUsage + candidate.pickedThisCall;
      const winnerUsage = winner.priorUsage + winner.pickedThisCall;
      if (
        candidateUsage < winnerUsage ||
        (candidateUsage === winnerUsage &&
          candidate.question_count > winner.question_count) ||
        (candidateUsage === winnerUsage &&
          candidate.question_count === winner.question_count &&
          candidate.key < winner.key)
      ) {
        winner = candidate;
      }
    }
    winner.pickedThisCall += 1;
  }

  return pool
    .filter((group) => group.pickedThisCall > 0)
    .map((group) => ({
      topic: group.topic,
      subtopic: group.subtopic,
      questionType: group.question_type,
      count: group.pickedThisCall,
      marksPerCorrect: group.marksPerCorrect,
      negativeMarksPerWrong: group.negativeMarksPerWrong,
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

  // Prior generations from this EXACT same source pool (see
  // findMockTestsGeneratedFromSameSourceSet) feed scaleDistributionToTarget
  // which topic/subtopic/type groups already got covered, so a repeat
  // generation rotates toward under-used groups instead of landing on the
  // same deterministic subset every time - a fresh/first-ever source pool
  // just gets an empty usage list, which scaleDistributionToTarget treats
  // as every group starting equally unused (its old, still-correct
  // behavior for a first run).
  const priorGeneratedIds =
    await mockTestsRepo.findMockTestsGeneratedFromSameSourceSet(
      uniqueSourceIds,
    );
  const usageRows =
    priorGeneratedIds.length > 0
      ? await mockTestsRepo.getTopicDistributionForMockTests(priorGeneratedIds)
      : [];

  const topicDistribution = scaleDistributionToTarget(
    distributionRows,
    count,
    usageRows,
  );

  await mockTestsRepo.insertGenerationSources(
    pool,
    mockTest.id,
    uniqueSourceIds,
  );

  const { processingJob, mockTest: updatedMockTest } = await queueProcessingJob(
    {
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
    },
  );

  return { processingJob, mockTest: updatedMockTest };
}

// Shared by both the legacy buffer-through-Node path (#uploadDocument,
// still used by anything that can't do a direct-to-B2 PUT) and the direct
// upload path (#completeUpload) below - everything from here down runs
// the same either way, the only difference is whether the PDF bytes
// passed through this server or went straight to B2 from the browser.
async function finalizeUpload({
  mockTest,
  workspaceId,
  userId,
  storageKey,
  originalFilename,
  mimeType,
  fileSizeBytes,
  documentType,
}) {
  const normalizedDocumentType = normalizeDocumentType(documentType);
  const client = await pool.connect();

  let uploadedFile;
  try {
    await client.query("BEGIN");

    uploadedFile = await mockTestsRepo.insertUploadedFile(client, {
      workspaceId,
      mockTestId: mockTest.id,
      uploadedBy: userId,
      originalFilename,
      storageKey,
      mimeType: mimeType || "application/pdf",
      fileSizeBytes,
      // No localPath anymore - worker/worker.py#download_job_pdf reads
      // storageKey straight off processing_jobs.input_config instead
      // (see queueProcessingJob below), which is set on every job
      // regardless of upload vs reprocess, so this metadata blob no
      // longer needs to carry a path of any kind.
      metadata: {
        uploadedVia: "mock-test-create-modal",
        documentType: normalizedDocumentType,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    // The file already landed in B2 before this transaction ran. If the
    // DB insert failed, don't leave an orphaned PDF behind there either.
    await deletePdf(storageKey);
    throw error;
  } finally {
    client.release();
  }

  const { processingJob, mockTest: updatedMockTest } = await queueProcessingJob(
    {
      mockTest,
      workspaceId,
      uploadedFileId: uploadedFile.id,
      requestedBy: userId,
      originalFilename,
      storageKey,
      documentType: normalizedDocumentType,
    },
  );

  return { uploadedFile, processingJob, mockTest: updatedMockTest };
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

  const storageKey = buildPdfStorageKey(
    workspaceId,
    mockTest.id,
    file.originalname,
  );
  // Uploaded before the DB transaction inside finalizeUpload, same
  // ordering the old local-disk version used (multer wrote the file to
  // disk before this function ever ran) - if the DB insert then fails,
  // there's a real but orphaned B2 object to clean up, never a DB row
  // pointing at a PDF that was never actually stored.
  await uploadPdf(file.buffer, storageKey, file.mimetype);

  return finalizeUpload({
    mockTest,
    workspaceId,
    userId,
    storageKey,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    documentType,
  });
}

// Step 1 of the direct-to-B2 path: hand the browser a short-lived URL it
// can PUT the PDF to itself, so the bytes go browser -> B2 directly
// instead of browser -> this server -> B2. See useMockTestWorkspace's
// upload handler / api.js#uploadMockTestDocument on the frontend.
export async function createUploadUrl({
  workspaceId,
  mockTest,
  originalFilename,
  mimeType,
}) {
  if (!originalFilename) {
    throw httpError(400, "originalFilename is required");
  }
  const storageKey = buildPdfStorageKey(
    workspaceId,
    mockTest.id,
    originalFilename,
  );
  const uploadUrl = await getPresignedUploadUrl(
    storageKey,
    mimeType || "application/pdf",
  );
  return { uploadUrl, storageKey };
}

// Step 2 of the direct-to-B2 path: the browser has already PUT the bytes
// to B2 itself by the time this runs. Never trust that on its own - a
// client could call this with a storageKey it never actually uploaded to
// - so headPdf() re-checks B2 directly and takes the real size/content
// type from there rather than whatever the request body claims.
export async function completeUpload({
  mockTest,
  workspaceId,
  userId,
  storageKey,
  originalFilename,
  documentType,
}) {
  if (
    !storageKey ||
    !storageKey.startsWith(`uploads/${workspaceId}/${mockTest.id}/`)
  ) {
    throw httpError(
      400,
      "storageKey is missing or does not match this mock test",
    );
  }

  const info = await headPdf(storageKey);
  if (!info.exists) {
    throw httpError(
      400,
      "Upload not found in storage - the direct upload to B2 may not have completed. Please retry.",
    );
  }

  return finalizeUpload({
    mockTest,
    workspaceId,
    userId,
    storageKey,
    originalFilename: originalFilename || storageKey.split("/").pop(),
    mimeType: info.mimeType,
    fileSizeBytes: info.sizeBytes,
    documentType,
  });
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
  const withDiagrams = await attachDiagramUrls(questions, workspaceId);

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
    questions: withDiagrams.map((question) => ({
      questionId: question.questionId,
      questionNo: question.questionNo,
      topic: question.topic,
      text: question.text,
      options: question.options,
      questionType: question.questionType,
      diagramUrl: question.diagramUrl,
      placement: question.placement,
      diagramAssets: question.diagramAssets,
    })),
  };
}
