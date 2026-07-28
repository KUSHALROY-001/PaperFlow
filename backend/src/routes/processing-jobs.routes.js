import { Router } from "express";
import * as jobsController from "../controllers/processing-jobs.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const processingJobsRouter = Router();

processingJobsRouter.get("/", asyncHandler(jobsController.list));
processingJobsRouter.get("/:jobId", asyncHandler(jobsController.getOne));
// Job status is normally only ever mutated by the Python worker (which talks
// to Postgres directly, bypassing this API entirely). This route exists for
// manual intervention/ops use, so it's locked to admin/owner rather than left
// open to every workspace member.
processingJobsRouter.patch(
  "/:jobId",
  requireRole("admin"),
  asyncHandler(jobsController.update),
);
