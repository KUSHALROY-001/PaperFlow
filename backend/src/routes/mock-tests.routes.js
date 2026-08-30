import { Router } from "express";
import multer from "multer";
import * as mockTestsController from "../controllers/mock-tests.controller.js";
import * as questionsController from "../controllers/questions.controller.js";
import * as attemptsController from "../controllers/attempts.controller.js";
import * as sharedController from "../controllers/shared.controller.js";
import * as pdfPageController from "../controllers/pdf-page.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { httpError } from "../lib/http-error.js";
import { requireRole } from "../middleware/require-role.js";
import * as mockTestsService from "../services/mock-tests.service.js";

export const mockTestsRouter = Router();

// Loads the mock test (scoped to the caller's workspace) and attaches it to
// req.mockTest. Runs BEFORE multer on the upload route specifically so an
// unauthorized/nonexistent mockTestId fails with a 404 before any file is
// ever read into memory, instead of after (which used to leave orphaned PDFs
// behind on local disk - see the audit notes; now that uploads go straight
// to B2 via a memory buffer, an early failure here means nothing was ever
// sent to B2 at all, an even cleaner version of the same guarantee).
const loadMockTest = asyncHandler(async (req, _res, next) => {
  req.mockTest = await mockTestsService.getMockTestOrFail(
    req.params.mockTestId,
    req.workspaceId,
  );
  next();
});

// memoryStorage, not diskStorage - the file needs to end up in B2, not on
// this container's local disk (which the worker, running as a separate
// deployed service, can't see at all - see mock-tests.service.js
// #uploadDocument, which uploads req.file.buffer to B2 directly).
// req.file.buffer replaces the old req.file.path/filename this route used
// to read.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter(_req, file, callback) {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      callback(httpError(400, "Only PDF files are supported"));
      return;
    }

    callback(null, true);
  },
});

mockTestsRouter.get("/", asyncHandler(mockTestsController.list));
mockTestsRouter.get("/:mockTestId", asyncHandler(mockTestsController.getOne));
// editor+ (matches the diagram-crop/upload routes on questions.routes.js) -
// this feeds the same DiagramCropModal.jsx flow, just sourcing the image
// from the original PDF instead of an uploaded file.
mockTestsRouter.get(
  "/:mockTestId/pdf-page",
  requireRole("editor"),
  asyncHandler(pdfPageController.getPage),
);
mockTestsRouter.get(
  "/:mockTestId/summary",
  asyncHandler(mockTestsController.getSummary),
);
mockTestsRouter.get(
  "/:mockTestId/generation-sources",
  asyncHandler(mockTestsController.getGenerationSources),
);
mockTestsRouter.patch(
  "/:mockTestId",
  requireRole("editor"),
  asyncHandler(mockTestsController.update),
);
mockTestsRouter.post(
  "/:mockTestId/publish",
  requireRole("editor"),
  asyncHandler(mockTestsController.publish),
);
mockTestsRouter.delete(
  "/:mockTestId",
  requireRole("admin"),
  asyncHandler(mockTestsController.remove),
);

mockTestsRouter.post(
  "/:mockTestId/upload",
  requireRole("editor"),
  loadMockTest,
  upload.single("document"),
  asyncHandler(mockTestsController.upload),
);
// Direct-to-B2 upload path (see mock-tests.service.js#createUploadUrl /
// #completeUpload) - both plain JSON, deliberately no `upload.single()`
// here since the PDF bytes never pass through this server at all on this
// path, only the presigned URL request and the small completion receipt.
mockTestsRouter.post(
  "/:mockTestId/upload-url",
  requireRole("editor"),
  loadMockTest,
  asyncHandler(mockTestsController.createUploadUrl),
);
mockTestsRouter.post(
  "/:mockTestId/upload-complete",
  requireRole("editor"),
  loadMockTest,
  asyncHandler(mockTestsController.completeUpload),
);
mockTestsRouter.post(
  "/:mockTestId/generate-from-existing",
  requireRole("editor"),
  loadMockTest,
  asyncHandler(mockTestsController.generateFromExisting),
);
mockTestsRouter.post(
  "/:mockTestId/reprocess",
  requireRole("editor"),
  loadMockTest,
  asyncHandler(mockTestsController.reprocess),
);
mockTestsRouter.post(
  "/:mockTestId/cancel-processing",
  requireRole("editor"),
  loadMockTest,
  asyncHandler(mockTestsController.cancelProcessing),
);

mockTestsRouter.get(
  "/:mockTestId/questions",
  asyncHandler(mockTestsController.listQuestions),
);
// No requireRole restriction - matches GET .../questions above (any
// workspace member who can view questions can download them as a PDF
// too). loadMockTest gives req.mockTest for both the workspace-ownership
// check and the export's filename/title.
mockTestsRouter.post(
  "/:mockTestId/pdf-export",
  loadMockTest,
  asyncHandler(mockTestsController.exportPdf),
);
mockTestsRouter.put(
  "/:mockTestId/questions/reorder",
  requireRole("editor"),
  asyncHandler(questionsController.reorder),
);
mockTestsRouter.get(
  "/:mockTestId/play",
  asyncHandler(mockTestsController.play),
);

mockTestsRouter.post(
  "/:mockTestId/attempts",
  asyncHandler(attemptsController.start),
);
mockTestsRouter.get(
  "/:mockTestId/attempts",
  asyncHandler(attemptsController.listForMockTest),
);
mockTestsRouter.get(
  "/:mockTestId/submissions",
  requireRole("editor"),
  asyncHandler(attemptsController.listSubmissionsForMockTest),
);

mockTestsRouter.post(
  "/:mockTestId/share",
  requireRole("editor"),
  asyncHandler(sharedController.createShareLink),
);
mockTestsRouter.get(
  "/:mockTestId/share",
  requireRole("editor"),
  asyncHandler(sharedController.listShares),
);
mockTestsRouter.delete(
  "/:mockTestId/share/:shareId",
  requireRole("editor"),
  asyncHandler(sharedController.revokeShareLink),
);
