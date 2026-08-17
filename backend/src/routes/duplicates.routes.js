import { Router } from "express";
import * as duplicatesController from "../controllers/duplicates.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const duplicatesRouter = Router();

duplicatesRouter.get("/", asyncHandler(duplicatesController.list));
duplicatesRouter.get("/count", asyncHandler(duplicatesController.count));
// editor+ - resolving a pair can reject a real question (the 'merge'
// action), same bar as editing/rejecting a question anywhere else in the
// review flow (see questions.routes.js's PATCH /:questionId).
duplicatesRouter.post(
  "/:pairId/resolve",
  requireRole("editor"),
  asyncHandler(duplicatesController.resolve),
);
