import { Router } from "express";
import * as duplicatesController from "../controllers/duplicates.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const duplicatesRouter = Router();

duplicatesRouter.get("/", asyncHandler(duplicatesController.list));
duplicatesRouter.get("/count", asyncHandler(duplicatesController.count));
