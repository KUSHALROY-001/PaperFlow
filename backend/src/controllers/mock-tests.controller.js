import * as mockTestsService from "../services/mock-tests.service.js";
import { renderMockTestPdf } from "../lib/pdf-export/index.js";

export async function list(req, res) {
  const mockTests = await mockTestsService.listMockTests(req.workspaceId);
  res.json({ mockTests });
}

export async function getOne(req, res) {
  const mockTest = await mockTestsService.getMockTestOrFail(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ mockTest });
}

export async function getSummary(req, res) {
  const mockTest = await mockTestsService.getMockTestSummary(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ mockTest });
}

export async function getGenerationSources(req, res) {
  const sources = await mockTestsService.getGenerationSources(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ sources });
}

export async function update(req, res) {
  const mockTest = await mockTestsService.updateMockTest(
    req.params.mockTestId,
    req.workspaceId,
    req.body,
  );
  res.json({ mockTest });
}

export async function publish(req, res) {
  const mockTest = await mockTestsService.publishMockTest(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ mockTest });
}

export async function remove(req, res) {
  await mockTestsService.deleteMockTest(req.params.mockTestId, req.workspaceId);
  res.status(204).send();
}

export async function upload(req, res) {
  // req.mockTest is attached by the loadMockTest middleware, which runs
  // BEFORE multer saves the file to disk - see routes file for why.
  const result = await mockTestsService.uploadDocument({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    userId: req.user.id,
    file: req.file,
    // multer parses non-file multipart fields into req.body alongside req.file
    documentType: req.body.documentType,
  });
  res.status(201).json(result);
}

// Direct-to-B2 upload, step 1: hand back a presigned PUT URL. Ordinary
// JSON body, no multer - the whole point is the PDF bytes never come
// through this server.
export async function createUploadUrl(req, res) {
  const result = await mockTestsService.createUploadUrl({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    originalFilename: req.body.originalFilename,
    mimeType: req.body.mimeType,
  });
  res.status(200).json(result);
}

// Direct-to-B2 upload, step 2: browser has already PUT the file straight
// to B2 using the URL from createUploadUrl above; this just confirms it
// landed (see mock-tests.service.js#completeUpload) and does the same
// DB-insert + queue-processing-job work #upload does for the old path.
export async function completeUpload(req, res) {
  const result = await mockTestsService.completeUpload({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    userId: req.user.id,
    storageKey: req.body.storageKey,
    originalFilename: req.body.originalFilename,
    documentType: req.body.documentType,
  });
  res.status(201).json(result);
}

// "Generate from existing tests" - no file upload, no multer, ordinary
// JSON body (see routes file - this route sits in the same requireAuth-
// wrapped router as everything else, unlike /upload which has its own
// multer middleware in front of it).
export async function generateFromExisting(req, res) {
  const result = await mockTestsService.generateFromExisting({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    userId: req.user.id,
    sourceMockTestIds: req.body.sourceMockTestIds,
    targetQuestionCount: req.body.targetQuestionCount,
    difficultyHint: req.body.difficultyHint,
  });
  res.status(201).json(result);
}

export async function cancelProcessing(req, res) {
  const result = await mockTestsService.cancelProcessing({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
  });
  res.json(result);
}

export async function reprocess(req, res) {
  const result = await mockTestsService.reprocessMockTest({
    mockTest: req.mockTest,
    workspaceId: req.workspaceId,
    userId: req.user.id,
  });
  res.status(201).json(result);
}

export async function questionStats(req, res) {
  const stats = await mockTestsService.getQuestionStats(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json({ stats });
}

// Hard ceiling on how many questions one request can ask for. The point
// of this endpoint being paginated at all is that a big paper must never
// be serialized in one response; letting a client pass ?limit=5000 would
// hand that footgun straight back.
const MAX_QUESTIONS_PAGE_SIZE = 200;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function listQuestions(req, res) {
  // No ?limit= means the original unpaginated response shape
  // ({ questions: [...] }), which existing callers still depend on.
  // Passing a limit opts into the paged envelope (total / nextOffset).
  if (req.query.limit === undefined) {
    const questions = await mockTestsService.listQuestions(
      req.params.mockTestId,
      req.workspaceId,
    );
    res.json({ questions });
    return;
  }

  const limit = Math.min(
    Math.max(parsePositiveInt(req.query.limit, 30) || 1, 1),
    MAX_QUESTIONS_PAGE_SIZE,
  );
  const offset = parsePositiveInt(req.query.offset, 0);

  const page = await mockTestsService.listQuestionsPage(
    req.params.mockTestId,
    req.workspaceId,
    { limit, offset },
  );
  res.json(page);
}

export async function play(req, res) {
  const result = await mockTestsService.getPlayableMockTest(
    req.params.mockTestId,
    req.workspaceId,
  );
  res.json(result);
}

const FILENAME_UNSAFE_RE = /[^a-z0-9]+/gi;

export async function exportPdf(req, res) {
  // req.mockTest is attached by loadMockTest (see routes file) - reused
  // here purely for the filename/title, since it already did the
  // workspace-ownership check this endpoint needs anyway.
  const questions = await mockTestsService.listQuestions(
    req.mockTest.id,
    req.workspaceId,
  );

  // Puppeteer's browser is a separate OS process making real HTTP
  // requests for every diagram <img> and katex.min.css - it needs an
  // address it can actually reach, not the relative paths
  // attachDiagramUrls returns for the SPA's own same-origin <img> tags.
  // Loopback + this process's own port is correct regardless of
  // deployment (reverse proxy, custom domain, etc.) since the browser and
  // the API serving these assets always run on the same host here.
  const baseUrl =
    process.env.INTERNAL_API_URL ||
    `http://127.0.0.1:${process.env.PORT || 4000}`;

  const pdfBuffer = await renderMockTestPdf({
    mockTest: req.mockTest,
    questions,
    baseUrl,
  });

  const filename =
    // mock_tests.name is the actual DB column (see migrations/001_initial_schema.sql)
    // - req.mockTest has no `title` field, so this always fell through to
    // the hardcoded fallback below.
    (req.mockTest.name || "mock-test")
      .trim()
      .replace(FILENAME_UNSAFE_RE, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "mock-test";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.pdf"`,
  );
  res.send(pdfBuffer);
}
