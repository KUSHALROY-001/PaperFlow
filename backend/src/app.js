import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { authRouter } from "./routes/auth.routes.js";
import { attemptsRouter } from "./routes/attempts.routes.js";
import { duplicatesRouter } from "./routes/duplicates.routes.js";
import { clustersRouter } from "./routes/clusters.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { extractionTemplatesRouter } from "./routes/extraction-templates.routes.js";
import { mockTestsRouter } from "./routes/mock-tests.routes.js";
import { processingJobsRouter } from "./routes/processing-jobs.routes.js";
import { questionsRouter } from "./routes/questions.routes.js";
import { questionBankRouter } from "./routes/question-bank.routes.js";
import { reviewQueueRouter } from "./routes/review-queue.routes.js";
import { sharedRouter } from "./routes/shared.routes.js";
import { teamRouter } from "./routes/team.routes.js";
import { studentsRouter } from "./routes/students.routes.js";
import { cohortsRouter } from "./routes/cohorts.routes.js";
import { requireAuth } from "./middleware/require-auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { asyncHandler } from "./lib/async-handler.js";
import * as questionAssetsController from "./controllers/question-assets.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // katex.min.css's @font-face rules are loaded by Puppeteer's PDF-export
  // page (src/lib/pdf-export/render-html.js), which is rendered via
  // page.setContent() rather than an actual http(s) navigation. Pages
  // loaded that way have an opaque origin, and per the CSS Fonts spec
  // browsers send that as the literal string "null" for cross-origin font
  // requests specifically - plain <img>/<link> loads (the diagram images,
  // the CSS file itself) mostly don't send an Origin header at all, which
  // is why only the font files were ever hitting this check. `"null"` is
  // a truthy JS string, so it skipped the `!origin` branch below and got
  // rejected by the strict allowlist just like any other unknown origin -
  // silently, since a failed @font-face load has no visible error, it
  // just falls back to a substitute font. Net effect: every exported PDF
  // was rendering math with broken/fallback glyphs instead of KaTeX's own
  // fonts, with nothing showing in anyone's UI to say so.
  //
  // Using cors()'s per-request delegate form (rather than the single
  // static options object this used to be) so /static/katex - already
  // documented below as intentionally public/unauthenticated - can get a
  // permissive policy that correctly reflects back an Origin of "null",
  // without loosening the strict allowlist for every authenticated API
  // route.
  const publicStaticPrefixes = ["/static/katex"];

  app.use(
    cors((req, callback) => {
      if (publicStaticPrefixes.some((prefix) => req.path.startsWith(prefix))) {
        callback(null, { origin: true, credentials: false });
        return;
      }

      const origin = req.headers.origin;
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, { origin: true, credentials: true });
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
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

  // Serves katex.min.css and its @font-face files (woff2/ttf) for
  // pdf-export/render-html.js's <link>. Deliberately public/unauthenticated
  // like the diagram routes below - it's static third-party CSS/fonts, not
  // workspace data, and Puppeteer's own page has no session/JWT to send
  // even if this required one.
  app.use(
    "/static/katex",
    express.static(path.join(__dirname, "../node_modules/katex/dist")),
  );

  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/clusters", requireAuth, clustersRouter);
  app.use("/api/extraction-templates", requireAuth, extractionTemplatesRouter);
  app.use("/api/mock-tests", requireAuth, mockTestsRouter);
  app.use("/api/processing-jobs", requireAuth, processingJobsRouter);
  // Deliberately public, registered BEFORE the requireAuth-wrapped
  // /api/questions mount below so this exact path is handled here first
  // and never reaches that middleware. A plain <img src="..."> request
  // carries no Authorization header - this route's own signed
  // access_token query param (see lib/diagram-signed-url.js) is its
  // entire authentication, the same pattern /api/shared already uses.
  app.get(
    "/api/questions/:questionId/diagram",
    asyncHandler(questionAssetsController.serveDiagram),
  );
  // Same reasoning as the route above, just for the oversized pre-crop
  // original that DiagramCropModal edits against - a plain <img src> for
  // this one too, so it needs the same signed-token exception.
  app.get(
    "/api/questions/:questionId/diagram-original",
    asyncHandler(questionAssetsController.serveDiagramOriginal),
  );
  app.use("/api/questions", requireAuth, questionsRouter);
  app.use("/api/review-queue", requireAuth, reviewQueueRouter);
  app.use("/api/question-bank", requireAuth, questionBankRouter);
  app.use("/api/attempts", requireAuth, attemptsRouter);
  app.use("/api/duplicates", requireAuth, duplicatesRouter);
  app.use("/api/team", requireAuth, teamRouter);
  app.use("/api/students", requireAuth, studentsRouter);
  app.use("/api/cohorts", requireAuth, cohortsRouter);
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
