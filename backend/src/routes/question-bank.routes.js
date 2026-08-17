import { Router } from "express";
import * as questionBankController from "../controllers/question-bank.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const questionBankRouter = Router();

// GET routes (search/browse) have no requireRole beyond the requireAuth
// already applied when this router is mounted in app.js - viewers can
// browse and search the bank same as any editor, matching how the rest
// of this app treats read access (QuickActionsPanel.jsx/QuestionForm.jsx
// gate the ACTION of adding/editing, never the ability to look).
questionBankRouter.get("/", asyncHandler(questionBankController.search));
questionBankRouter.get(
  "/topics",
  asyncHandler(questionBankController.listTopics),
);

// Copying a question into a mock test is an editor-level write (creates
// a real question row + options, same as questionsRouter's own
// POST /api/questions), so it gets the same "editor" floor as every
// other question-creating route in this app.
questionBankRouter.post(
  "/:questionId/copy",
  requireRole("editor"),
  asyncHandler(questionBankController.copyToMockTest),
);

// Phase 3: bulk copy. A distinct path segment ("/copy-bulk"), not
// "/:questionId/copy" with an array body - keeping the single-question
// route's URL shape (one question, its own id in the path) meaning
// exactly one thing, rather than overloading it to sometimes mean "copy
// these N questions" based on body shape alone.
questionBankRouter.post(
  "/copy-bulk",
  requireRole("editor"),
  asyncHandler(questionBankController.copyManyToMockTest),
);
