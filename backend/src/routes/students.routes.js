import { Router } from "express";
import * as studentsController from "../controllers/students.controller.js";
import { asyncHandler } from "../lib/async-handler.js";

export const studentsRouter = Router();

studentsRouter.get("/", asyncHandler(studentsController.listStudents));
studentsRouter.get(
  "/weak-topics",
  asyncHandler(studentsController.getWeakTopics),
);
studentsRouter.get(
  "/:email",
  asyncHandler(studentsController.getStudentDetail),
);
