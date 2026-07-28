import { Router } from "express";
import * as clustersController from "../controllers/clusters.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const clustersRouter = Router();

clustersRouter.get("/", asyncHandler(clustersController.list));
clustersRouter.post(
  "/",
  requireRole("editor"),
  asyncHandler(clustersController.create),
);
clustersRouter.get("/:clusterId", asyncHandler(clustersController.getOne));
clustersRouter.patch(
  "/:clusterId",
  requireRole("editor"),
  asyncHandler(clustersController.update),
);
clustersRouter.delete(
  "/:clusterId",
  requireRole("admin"),
  asyncHandler(clustersController.remove),
);

clustersRouter.get(
  "/:clusterId/mock-tests",
  asyncHandler(clustersController.listMockTests),
);
clustersRouter.post(
  "/:clusterId/mock-tests",
  requireRole("editor"),
  asyncHandler(clustersController.createMockTest),
);
