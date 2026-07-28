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

export async function updateMockTest(mockTestId, workspaceId, body) {
  const name =
    body.name === undefined ? undefined : requiredString(body.name, "name");
  const descriptionProvided = body.description !== undefined;
  const description = optionalString(body.description);
  const examYearProvided = body.examYear !== undefined;
  const examYear = body.examYear ?? null;
  const status = body.status || null;

  const mockTest = await mockTestsRepo.updateMockTest(mockTestId, workspaceId, {
    name,
    descriptionProvided,
    description,
    examYearProvided,
    examYear,
    durationMinutes: optionalNumber(body.durationMinutes, null),
    marksPerCorrect: optionalNumber(body.marksPerCorrect, null),
    negativeMarksPerWrong: optionalNumber(body.negativeMarksPerWrong, null),
    status,
  });

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
  extraInputConfig = {},
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const job = await mockTestsRepo.insertProcessingJob(client, {
      workspaceId,
      mockTestId: mockTest.id,
      uploadedFileId,
      requestedBy,
      inputConfig: { originalFilename, storageKey, ...extraInputConfig },
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

export async function uploadDocument({ mockTest, workspaceId, userId, file }) {
  if (!file) {
    throw httpError(400, "PDF document is required");
  }

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
      metadata: { localPath: file.path, uploadedVia: "mock-test-create-modal" },
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
  });

  return { uploadedFile, processingJob, mockTest: updatedMockTest, worker };
}

export async function reprocessMockTest({ mockTest, workspaceId, userId }) {
  const latestFile = await mockTestsRepo.findLatestUploadedFile(
    mockTest.id,
    workspaceId,
  );

  if (!latestFile) {
    throw httpError(400, "Upload a PDF before reprocessing this mock test");
  }

  return queueProcessingJob({
    mockTest,
    workspaceId,
    uploadedFileId: latestFile.id,
    requestedBy: userId,
    originalFilename: latestFile.original_filename,
    storageKey: latestFile.storage_key,
    extraInputConfig: { reprocess: true },
  });
}

export async function listQuestions(mockTestId, workspaceId) {
  await getMockTestOrFail(mockTestId, workspaceId);
  return mockTestsRepo.listQuestionsWithOptions(mockTestId, workspaceId);
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
    questions: questions.map((question) => ({
      questionNo: question.questionNo,
      topic: question.topic,
      text: question.text,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      questionType: question.questionType,
      explanation: question.explanation,
    })),
  };
}
