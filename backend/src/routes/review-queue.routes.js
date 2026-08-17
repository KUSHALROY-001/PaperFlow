import { Router } from "express";
import * as reviewQueueController from "../controllers/review-queue.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const reviewQueueRouter = Router();

// Read-only - approve/reject/edit reuse PATCH /api/questions/:questionId
// directly (see questions.routes.js) rather than this router duplicating
// that mutation path, so there's exactly one place that knows how to
// write a question.
reviewQueueRouter.get("/", asyncHandler(reviewQueueController.list));
reviewQueueRouter.get("/count", asyncHandler(reviewQueueController.count));
