import { Router } from "express";
import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";
import * as mockTestsController from "../controllers/mock-tests.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { ensureUploadDir } from "../lib/file-storage.js";
import { httpError } from "../lib/http-error.js";
import { requireRole } from "../middleware/require-role.js";
import * as mockTestsService from "../services/mock-tests.service.js";

export const mockTestsRouter = Router();

// Loads the mock test (scoped to the caller's workspace) and attaches it to
// req.mockTest. Runs BEFORE multer on the upload route specifically so an
// unauthorized/nonexistent mockTestId fails with a 404 before any file is
// ever written to disk, instead of after (which used to leave orphaned PDFs
// behind - see the audit notes).
const loadMockTest = asyncHandler(async (req, _res, next) => {
  req.mockTest = await mockTestsService.getMockTestOrFail(
    req.params.mockTestId,
    req.workspaceId,
  );
  next();
});

const upload = multer({
  storage: multer.diskStorage({
    async destination(req, _file, callback) {
      try {
        const targetDir = await ensureUploadDir(
          req.workspaceId,
          req.params.mockTestId,
        );
        callback(null, targetDir);
      } catch (error) {
        callback(error);
      }
    },
    filename(_req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase() || ".pdf";
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter(_req, file, callback) {
    const isPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
      callback(httpError(400, "Only PDF files are supported"));
      return;
    }

    callback(null, true);
  },
});

mockTestsRouter.get("/", asyncHandler(mockTestsController.list));
mockTestsRouter.get("/:mockTestId", asyncHandler(mockTestsController.getOne));
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
mockTestsRouter.post(
  "/:mockTestId/reprocess",
  requireRole("editor"),
  loadMockTest,
  asyncHandler(mockTestsController.reprocess),
);

mockTestsRouter.get(
  "/:mockTestId/questions",
  asyncHandler(mockTestsController.listQuestions),
);
mockTestsRouter.get(
  "/:mockTestId/play",
  asyncHandler(mockTestsController.play),
);
