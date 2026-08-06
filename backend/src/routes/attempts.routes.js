import { Router } from "express";
import * as attemptsController from "../controllers/attempts.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const attemptsRouter = Router();

attemptsRouter.get("/", asyncHandler(attemptsController.listMine));
attemptsRouter.get("/:attemptId", asyncHandler(attemptsController.getOne));
attemptsRouter.delete("/:attemptId", asyncHandler(attemptsController.remove));
attemptsRouter.put(
  "/:attemptId/answers/:questionId",
  asyncHandler(attemptsController.saveAnswer),
);
attemptsRouter.post(
  "/:attemptId/submit",
  asyncHandler(attemptsController.submit),
);
attemptsRouter.post(
  "/:attemptId/abandon",
  asyncHandler(attemptsController.abandon),
);
