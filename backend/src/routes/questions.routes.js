import { Router } from "express";
import * as questionsController from "../controllers/questions.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const questionsRouter = Router();

questionsRouter.post(
  "/",
  requireRole("editor"),
  asyncHandler(questionsController.create),
);
questionsRouter.get("/:questionId", asyncHandler(questionsController.getOne));
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
