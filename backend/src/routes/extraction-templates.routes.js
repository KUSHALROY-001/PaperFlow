import { Router } from "express";
import * as templatesController from "../controllers/extraction-templates.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const extractionTemplatesRouter = Router();

extractionTemplatesRouter.get("/", asyncHandler(templatesController.list));
extractionTemplatesRouter.post(
  "/",
  requireRole("editor"),
  asyncHandler(templatesController.create),
);
extractionTemplatesRouter.get(
  "/:templateId",
  asyncHandler(templatesController.getOne),
);
extractionTemplatesRouter.patch(
  "/:templateId",
  requireRole("editor"),
  asyncHandler(templatesController.update),
);
extractionTemplatesRouter.delete(
  "/:templateId",
  requireRole("admin"),
  asyncHandler(templatesController.remove),
);

extractionTemplatesRouter.post(
  "/:templateId/apply",
  requireRole("editor"),
  asyncHandler(templatesController.apply),
);
