import express from "express";
import cors from "cors";
import morgan from "morgan";
import { authRouter } from "./routes/auth.routes.js";
import { attemptsRouter } from "./routes/attempts.routes.js";
import { clustersRouter } from "./routes/clusters.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { extractionTemplatesRouter } from "./routes/extraction-templates.routes.js";
import { mockTestsRouter } from "./routes/mock-tests.routes.js";
import { processingJobsRouter } from "./routes/processing-jobs.routes.js";
import { questionsRouter } from "./routes/questions.routes.js";
import { sharedRouter } from "./routes/shared.routes.js";
import { teamRouter } from "./routes/team.routes.js";
import { requireAuth } from "./middleware/require-auth.js";
import { errorHandler } from "./middleware/error-handler.js";

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = new Set(
  [
    process.env.CORS_ORIGIN,
    // Hardcoded localhost dev origins should never be trusted in production.
    !isProduction && "http://localhost:5173",
    !isProduction && "http://127.0.0.1:5173",
    !isProduction && "http://localhost:5174",
    !isProduction && "http://127.0.0.1:5174",
  ].filter(Boolean),
);

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use((req, _res, next) => {
    req.body = req.body || {};
    next();
  });
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "paperflow-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/clusters", requireAuth, clustersRouter);
  app.use("/api/extraction-templates", requireAuth, extractionTemplatesRouter);
  app.use("/api/mock-tests", requireAuth, mockTestsRouter);
  app.use("/api/processing-jobs", requireAuth, processingJobsRouter);
  app.use("/api/questions", requireAuth, questionsRouter);
  app.use("/api/attempts", requireAuth, attemptsRouter);
  app.use("/api/team", requireAuth, teamRouter);
  // Deliberately public - this is how an unauthenticated visitor takes a
  // mock test via a share link. Every handler in shared.routes.js resolves
  // its own workspace scoping from the token, not from req.workspaceId
  // (which won't exist here, since requireAuth never ran).
  app.use("/api/shared", sharedRouter);

  app.use((_req, _res, next) => {
    next(Object.assign(new Error("Route not found"), { statusCode: 404 }));
  });

  app.use(errorHandler);

  return app;
}
