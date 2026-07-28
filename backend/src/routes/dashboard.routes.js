import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", asyncHandler(dashboardController.summary));
