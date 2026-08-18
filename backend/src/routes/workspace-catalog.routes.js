import { Router } from "express";
import * as workspaceCatalogController from "../controllers/workspace-catalog.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const workspaceCatalogRouter = Router();

workspaceCatalogRouter.get(
  "/",
  asyncHandler(workspaceCatalogController.getSettings),
);
// admin, not just editor - a public slug is a workspace-wide identity
// decision (and picks up every catalog-listed test's URL when changed),
// same bar as deleting a mock test elsewhere in this router set.
workspaceCatalogRouter.put(
  "/slug",
  requireRole("admin"),
  asyncHandler(workspaceCatalogController.updateSlug),
);
