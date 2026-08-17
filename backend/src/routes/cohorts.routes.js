import { Router } from "express";
import * as cohortsController from "../controllers/cohorts.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const cohortsRouter = Router();

cohortsRouter.get("/", asyncHandler(cohortsController.listCohorts));
cohortsRouter.post("/", asyncHandler(cohortsController.createCohort));
cohortsRouter.get(
  "/:cohortId/members",
  asyncHandler(cohortsController.listCohortMembers),
);
cohortsRouter.post(
  "/:cohortId/members",
  asyncHandler(cohortsController.addCohortMember),
);
cohortsRouter.delete(
  "/:cohortId/members/:email",
  asyncHandler(cohortsController.removeCohortMember),
);
