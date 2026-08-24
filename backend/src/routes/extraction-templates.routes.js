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

// No requireRole here, deliberately - unlike create/update/delete/apply,
// rating a template doesn't modify workspace content, it records one
// user's personal opinion. Any workspace member who can see/browse a
// template (list/getOne, also ungated) can rate it, viewers included.
extractionTemplatesRouter.put(
  "/:templateId/rating",
  asyncHandler(templatesController.rate),
);
extractionTemplatesRouter.delete(
  "/:templateId/rating",
  asyncHandler(templatesController.unrate),
);
