import fs from "node:fs";
import { httpError } from "../lib/http-error.js";
import { verifyDiagramAccessToken } from "../lib/diagram-signed-url.js";
import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import * as sharedService from "../services/shared.service.js";

async function streamDiagram(req, res, { questionId, workspaceId }) {
  const token = req.query.access_token;
  if (!token) {
    throw httpError(401, "Missing access_token");
  }

  const verification = verifyDiagramAccessToken(
    String(token),
    questionId,
    workspaceId,
  );
  if (!verification.valid) {
    // Same status regardless of WHY it failed (expired vs tampered vs
    // wrong question) - narrating the specific reason to the client
    // gives a scanner free signal about which part of a forged token to
    // fix next, for no legitimate benefit to a real user (an expired
    // link just needs a fresh page load either way).
    throw httpError(403, "This image link is invalid or has expired");
  }

  const asset = await questionAssetsRepo.findAssetForQuestion(questionId);
  if (!asset) {
    // A valid, unexpired token for a question that has no (or no longer
    // has) a saved diagram - treat exactly like "not found", not a server
    // error. Can legitimately happen if a mock test was reprocessed
    // between the page loading and the image request landing.
    throw httpError(404, "No diagram found for this question");
  }

  res.setHeader("Cache-Control", "private, max-age=86400");
  const stream = fs.createReadStream(asset.storagePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).json({ error: "Diagram file not found on disk" });
    }
  });
  stream.pipe(res);
}

// Authenticated path - this route deliberately sits OUTSIDE requireAuth
// (see app.js), because a plain <img src="..."> request from the browser
// carries no Authorization header for requireAuth to populate
// req.workspaceId from - only apiRequest()'s fetch() calls attach that
// header. The signed access_token IS this route's entire authentication;
// its own embedded workspaceId is trusted once the signature verifies
// (see diagram-signed-url.js), so there's no independent workspaceId to
// pass in here.
export async function serveDiagram(req, res) {
  await streamDiagram(req, res, {
    questionId: req.params.questionId,
  });
}

// Public path - no requireAuth ran, so workspaceId has to come from
// resolving the share token itself (which also re-validates the share is
// still active/not expired, same as every other /api/shared/... route).
export async function serveSharedDiagram(req, res) {
  const workspaceId = await sharedService.resolveWorkspaceForShareToken(
    req.params.token,
  );
  await streamDiagram(req, res, {
    questionId: req.params.questionId,
    workspaceId,
  });
}
