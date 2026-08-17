import { Router } from "express";
import multer from "multer";
import * as questionsController from "../controllers/questions.controller.js";
import * as questionAssetsController from "../controllers/question-assets.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { httpError } from "../lib/http-error.js";
import { requireRole } from "../middleware/require-role.js";

export const questionsRouter = Router();

// Memory storage, not disk - unlike the PDF upload multer instance in
// mock-tests.routes.js, the controller re-encodes every upload through
// sharp() before it ever touches disk (see uploadDiagramImage), so there's
// no destination/filename config to write here at all; multer's only job
// is size/type validation and buffering into req.file.buffer.
const uploadDiagramImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const isImage = ["image/png", "image/jpeg", "image/webp"].includes(
      file.mimetype,
    );
    if (!isImage) {
      callback(httpError(400, "Only PNG, JPEG, or WEBP images are supported"));
      return;
    }
    callback(null, true);
  },
});

questionsRouter.post(
  "/",
  requireRole("editor"),
  asyncHandler(questionsController.create),
);
questionsRouter.get("/:questionId", asyncHandler(questionsController.getOne));
// Must be registered before PATCH /:questionId - Express matches routes
// in registration order, and :questionId's param pattern would otherwise
// swallow "bulk-status" as a literal (nonexistent) question id, since
// both routes share the same method and nesting level.
questionsRouter.patch(
  "/bulk-status",
  requireRole("editor"),
  asyncHandler(questionsController.bulkUpdateStatus),
);
questionsRouter.patch(
  "/:questionId",
  requireRole("editor"),
  asyncHandler(questionsController.update),
);
questionsRouter.delete(
  "/:questionId",
  requireRole("admin"),
  asyncHandler(questionsController.remove),
);

// These are ordinary JSON PUT/DELETE calls from apiRequest() (unlike
// GET /:questionId/diagram, which deliberately sits outside requireAuth -
// see question-assets.controller.js), so they live behind normal auth and
// role checks like every other question route.
questionsRouter.put(
  "/:questionId/diagram-crop",
  requireRole("editor"),
  asyncHandler(questionAssetsController.updateDiagramCrop),
);
questionsRouter.delete(
  "/:questionId/diagram-crop",
  requireRole("editor"),
  asyncHandler(questionAssetsController.resetDiagramCrop),
);

// Part C (manual image insert). POST .../diagram here is a different
// route than the public GET .../diagram in app.js - same path, different
// method, no collision, but easy to misread as the same route at a
// glance.
questionsRouter.post(
  "/:questionId/diagram",
  requireRole("editor"),
  uploadDiagramImageMiddleware.single("image"),
  asyncHandler(questionAssetsController.uploadDiagramImage),
);
questionsRouter.patch(
  "/:questionId/diagram-placement",
  requireRole("editor"),
  asyncHandler(questionAssetsController.updateDiagramPlacement),
);
questionsRouter.delete(
  "/:questionId/diagram",
  requireRole("editor"),
  asyncHandler(questionAssetsController.deleteDiagramImage),
);
