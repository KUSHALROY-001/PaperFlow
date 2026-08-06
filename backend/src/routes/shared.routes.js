import { Router } from "express";
import * as sharedController from "../controllers/shared.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const sharedRouter = Router();

sharedRouter.get("/:token", asyncHandler(sharedController.getSharedMockTest));
sharedRouter.post(
  "/:token/attempts",
  asyncHandler(sharedController.startSharedAttempt),
);
sharedRouter.get(
  "/:token/attempts/:attemptId",
  asyncHandler(sharedController.getSharedAttempt),
);
sharedRouter.put(
  "/:token/attempts/:attemptId/answers/:questionId",
  asyncHandler(sharedController.saveSharedAnswer),
);
sharedRouter.post(
  "/:token/attempts/:attemptId/submit",
  asyncHandler(sharedController.submitSharedAttempt),
);
