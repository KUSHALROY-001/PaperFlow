import { Router } from "express";
import * as catalogController from "../controllers/catalog.controller.js";
import * as subscriptionsController from "../controllers/subscriptions.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const catalogRouter = Router();

// Deliberately public, no requireAuth anywhere on this router - same
// trust model as shared.routes.js. Every handler resolves its own
// workspace from the :slug param, never from req.workspaceId (which
// won't exist here).
//
// Global routes registered FIRST and deliberately: "/exam-years" is a
// single path segment, exactly the same shape as "/:slug" below it - if
// "/:slug" were registered first, a request to GET /api/catalog/exam-years
// would match it with slug="exam-years" instead of ever reaching this
// route. Same reasoning for GET "/" vs "/:slug" (empty segment vs one
// segment technically can't collide, but keeping every literal route
// above the wildcard is one less thing to reason about later).

catalogRouter.get("/", asyncHandler(catalogController.getGlobalCatalog));
catalogRouter.get(
  "/exam-years",
  asyncHandler(catalogController.getGlobalCatalogExamYears),
);
catalogRouter.get(
  "/mock-tests/:mockTestId",
  asyncHandler(catalogController.getGlobalCatalogMockTestDetail),
);

catalogRouter.get(
  "/subscriptions",
  asyncHandler(subscriptionsController.getSubscriptions),
);
catalogRouter.post(
  "/subscriptions",
  asyncHandler(subscriptionsController.subscribePublisher),
);
catalogRouter.delete(
  "/subscriptions/:slug",
  asyncHandler(subscriptionsController.unsubscribePublisher),
);

catalogRouter.get("/:slug", asyncHandler(catalogController.getCatalog));
catalogRouter.get(
  "/:slug/exam-years",
  asyncHandler(catalogController.getCatalogExamYears),
);
catalogRouter.get(
  "/:slug/mock-tests/:mockTestId",
  asyncHandler(catalogController.getCatalogMockTestDetail),
);
catalogRouter.post(
  "/:slug/mock-tests/:mockTestId/start",
  asyncHandler(catalogController.startCatalogAttempt),
);
