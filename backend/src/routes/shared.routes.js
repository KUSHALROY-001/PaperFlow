import { Router } from "express";
import * as sharedController from "../controllers/shared.controller.js";
import * as questionAssetsController from "../controllers/question-assets.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAuth } from "../middleware/require-auth.js";

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
sharedRouter.get(
  "/:token/questions/:questionId/diagram",
  asyncHandler(questionAssetsController.serveSharedDiagram),
);
sharedRouter.get(
  "/:token/questions/:questionId/diagram/:slotKey",
  asyncHandler(questionAssetsController.serveSharedDiagram),
);
sharedRouter.put(
  "/:token/attempts/:attemptId/answers/:questionId",
  asyncHandler(sharedController.saveSharedAnswer),
);
sharedRouter.post(
  "/:token/attempts/:attemptId/submit",
  asyncHandler(sharedController.submitSharedAttempt),
);
sharedRouter.post(
  "/:token/attempts/:attemptId/abandon",
  asyncHandler(sharedController.abandonSharedAttempt),
);
// Only authenticated route on this otherwise-public router - "save this
// result to my account" after already submitting anonymously.
sharedRouter.post(
  "/:token/attempts/:attemptId/claim",
  requireAuth,
  asyncHandler(sharedController.claimSharedAttempt),
);
