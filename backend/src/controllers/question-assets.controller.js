import fs from "node:fs";
import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { httpError } from "../lib/http-error.js";
import { verifyDiagramAccessToken } from "../lib/diagram-signed-url.js";
import {
  deleteFileByPath,
  ensureManualDiagramDir,
} from "../lib/file-storage.js";
import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import * as questionsRepo from "../repositories/questions.repository.js";
import * as sharedService from "../services/shared.service.js";

async function streamDiagram(
  req,
  res,
  { questionId, workspaceId, variant = "cropped" },
) {
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

  const filePath =
    variant === "original" ? asset.originalStoragePath : asset.storagePath;
  if (!filePath) {
    // Only reachable for the original variant: an asset extracted before
    // migration 014 has no original_storage_path. attachDiagramOriginalUrls
    // already omits diagramOriginalUrl for exactly these questions, so a
    // legitimate frontend never requests this - this only fires against a
    // hand-built URL or a stale page.
    throw httpError(404, "No original diagram found for this question");
  }

  res.setHeader("Cache-Control", "private, max-age=86400");
  const stream = fs.createReadStream(filePath);
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

// Same auth shape as serveDiagram above, just against original_storage_path
// instead of storage_path. Only ever linked to from the editor's
// DiagramCropModal (see question-assets.service.js#attachDiagramOriginalUrls) -
// exam-play and shared-attempt views never render this.
export async function serveDiagramOriginal(req, res) {
  await streamDiagram(req, res, {
    questionId: req.params.questionId,
    variant: "original",
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

// Pixel-coordinate rect against original_storage_path, as sent by
// DiagramCropModal (react-easy-crop reports its selection in the source
// image's own pixel space, not the on-screen scaled preview's).
function parseCropRect(body = {}) {
  const rect = {};
  for (const field of ["x", "y", "width", "height"]) {
    const value = Number(body[field]);
    if (!Number.isFinite(value)) {
      throw httpError(400, `${field} must be a number`);
    }
    rect[field] = Math.round(value);
  }

  if (rect.width <= 0 || rect.height <= 0) {
    throw httpError(400, "width and height must be greater than 0");
  }
  if (rect.x < 0 || rect.y < 0) {
    throw httpError(400, "x and y must not be negative");
  }

  return rect;
}

// Shared by both crop endpoints: confirms the question is in the caller's
// workspace (same check every other question route makes), then loads the
// asset row. A row missing original_storage_path means it was extracted
// before this feature shipped - there's nothing to crop against, so both
// endpoints refuse rather than silently no-op. The frontend disables "Edit
// Crop" for this same reason; this is the server-side backstop for a stale
// page that still has the button enabled.
async function loadCroppableAsset(questionId, workspaceId) {
  const question = await questionsRepo.findQuestionById(
    questionId,
    workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

  const asset = await questionAssetsRepo.findAssetForQuestion(questionId);
  if (!asset) {
    throw httpError(404, "No diagram found for this question");
  }
  if (!asset.originalStoragePath) {
    throw httpError(
      409,
      "This diagram has no original image to crop - re-extract it from the source PDF first",
    );
  }

  return asset;
}

export async function updateDiagramCrop(req, res) {
  const rect = parseCropRect(req.body);
  const asset = await loadCroppableAsset(
    req.params.questionId,
    req.workspaceId,
  );

  try {
    await sharp(asset.originalStoragePath)
      .extract({
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      })
      .toFile(asset.storagePath);
  } catch (error) {
    // sharp throws a generic Error (not one of ours) when the rect falls
    // outside the source image's bounds - the one way this request can be
    // malformed in a way parseCropRect can't catch up front, since it has
    // no idea how big the original image actually is.
    throw httpError(400, "Crop rectangle is outside the image bounds");
  }

  await questionAssetsRepo.setManualCrop(asset.id, true);

  res.json({ hasManualCrop: true });
}

export async function resetDiagramCrop(req, res) {
  const asset = await loadCroppableAsset(
    req.params.questionId,
    req.workspaceId,
  );

  await copyFile(asset.originalStoragePath, asset.storagePath);
  await questionAssetsRepo.setManualCrop(asset.id, false);

  res.json({ hasManualCrop: false });
}

// Part C: manual image insert. Handles both "this question has no diagram
// at all" (extraction never found one) and "replace whatever diagram it
// has now" (extracted or manual, per the plan's decision to allow
// replacing either) - the same upload does both, since replaceAssetForQuestion
// deletes any existing row before inserting the new one either way.
export async function uploadDiagramImage(req, res) {
  if (!req.file) {
    throw httpError(400, "Missing image file");
  }

  const question = await questionsRepo.findQuestionById(
    req.params.questionId,
    req.workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

  // Read before replace, purely so the new row can carry the placement the
  // user already had chosen forward (a replace shouldn't silently reset it
  // to the default) and so the OLD files can be cleaned up below once the
  // new ones are safely on disk and the DB row points at them instead.
  const previousAsset = await questionAssetsRepo.findAssetForQuestion(
    req.params.questionId,
  );

  let normalizedPng;
  try {
    // Re-encode through sharp rather than trusting the uploaded bytes
    // as-is - strips EXIF, normalizes to PNG regardless of whether the
    // upload was a JPEG/WEBP, and gives a clean 400 instead of a corrupt
    // file on disk if what came through fileFilter's mimetype check isn't
    // actually a decodable image.
    normalizedPng = await sharp(req.file.buffer).png().toBuffer();
  } catch (error) {
    throw httpError(400, "Could not process this image");
  }

  const targetDir = await ensureManualDiagramDir(
    req.workspaceId,
    question.mock_test_id,
  );
  // Fixed, deterministic filenames (not a random UUID like the PDF-upload
  // multer config uses) - a second manual upload for the same question is
  // a REPLACE, and reusing the same path means it overwrites in place
  // instead of leaving the previous manual upload's file behind.
  const storagePath = path.join(targetDir, `${question.id}.png`);
  const originalStoragePath = path.join(
    targetDir,
    `${question.id}.original.png`,
  );

  await writeFile(storagePath, normalizedPng);
  await writeFile(originalStoragePath, normalizedPng);

  await questionAssetsRepo.replaceAssetForQuestion(question.id, {
    storagePath: String(storagePath),
    originalStoragePath: String(originalStoragePath),
    source: "manual",
    placement: previousAsset?.placement || "below_text",
  });

  // Only the previous asset's files can be orphaned now - a second manual
  // upload reuses the exact paths above (already overwritten by the
  // writeFile calls), so there's nothing to delete in that case. An
  // extracted asset lived under diagrams/, a different directory entirely,
  // so its files are genuinely unreferenced once replaceAssetForQuestion's
  // DELETE+INSERT commits.
  if (previousAsset && previousAsset.storagePath !== String(storagePath)) {
    await deleteFileByPath(previousAsset.storagePath);
  }
  if (
    previousAsset?.originalStoragePath &&
    previousAsset.originalStoragePath !== String(originalStoragePath)
  ) {
    await deleteFileByPath(previousAsset.originalStoragePath);
  }

  res.status(201).json({ success: true });
}

const DIAGRAM_PLACEMENTS = ["above_text", "below_text", "below_options"];

// Independent of source deliberately - an extracted diagram is exactly as
// repositionable as a manually uploaded one, so this isn't folded into
// uploadDiagramImage above.
export async function updateDiagramPlacement(req, res) {
  const { placement } = req.body || {};
  if (!DIAGRAM_PLACEMENTS.includes(placement)) {
    throw httpError(
      400,
      `placement must be one of: ${DIAGRAM_PLACEMENTS.join(", ")}`,
    );
  }

  const question = await questionsRepo.findQuestionById(
    req.params.questionId,
    req.workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

  const asset = await questionAssetsRepo.findAssetForQuestion(question.id);
  if (!asset) {
    throw httpError(404, "No diagram found for this question");
  }

  await questionAssetsRepo.setPlacement(asset.id, placement);
  res.json({ placement });
}

// Removes the diagram entirely - the one thing nothing before Part C could
// do (the crop DELETE only resets to auto-crop; it never had a way to end
// up with zero diagrams again). Lets an editor undo an accidental upload,
// or clear a bad extraction before uploading their own replacement.
export async function deleteDiagramImage(req, res) {
  const question = await questionsRepo.findQuestionById(
    req.params.questionId,
    req.workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

  const asset = await questionAssetsRepo.findAssetForQuestion(question.id);
  if (!asset) {
    throw httpError(404, "No diagram found for this question");
  }

  await questionAssetsRepo.deleteAsset(asset.id);
  await deleteFileByPath(asset.storagePath);
  if (asset.originalStoragePath) {
    await deleteFileByPath(asset.originalStoragePath);
  }

  res.status(204).send();
}
