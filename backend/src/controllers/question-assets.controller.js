import sharp from "sharp";
import { httpError } from "../lib/http-error.js";
import { verifyDiagramAccessToken } from "../lib/diagram-signed-url.js";
import {
  assetCacheVersion,
  buildDiagramPublicId,
  deleteDiagram,
  diagramUrlForPublicId,
  fetchDiagramBuffer,
  isCloudinaryConfigured,
  uploadDiagramBuffer,
} from "../lib/cloudinary-storage.js";
import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import * as questionsRepo from "../repositories/questions.repository.js";
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

  if (!isCloudinaryConfigured()) {
    throw httpError(
      503,
      "Cloud image storage (Cloudinary) is not configured on the server",
    );
  }

  const asset = await questionAssetsRepo.findAssetForQuestion(questionId);
  if (!asset || !asset.storagePath) {
    // A valid, unexpired token for a question that has no (or no longer
    // has) a saved diagram - treat exactly like "not found", not a server
    // error. Can legitimately happen if a mock test was reprocessed
    // between the page loading and the image request landing.
    throw httpError(404, "No diagram found for this question");
  }

  // asset.storagePath holds a Cloudinary public_id (see worker/asset_extractor.py
  // and uploadDiagramImage). Redirect to a VERSIONED Cloudinary URL so a
  // replace/crop (same public_id, new bytes) is not served from CDN/browser
  // cache of the previous PNG. The ?v= on our own /diagram URL is the
  // matching browser-cache key (see attachDiagramUrls).
  const deliveryUrl = diagramUrlForPublicId(
    asset.storagePath,
    assetCacheVersion(asset.createdAt),
  );
  // private, no-cache: this 302's Location includes the version, but a
  // long-lived cached redirect to an unversioned (or old-version) URL is
  // exactly how a successful replace used to keep showing the old image.
  res.setHeader("Cache-Control", "private, no-cache");
  res.redirect(302, deliveryUrl);
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

// Pixel-coordinate rect against the diagram's current image (as sent by
// DiagramCropModal - react-image-crop reports its selection in the
// source image's own pixel space, not the on-screen scaled preview's).
// "Current image" means whatever storage_path already holds - the
// previous crop, if there was one, or the original extraction if not
// (see migration 022_diagram_single_image.sql: there's only ever one
// stored image per diagram now, so a second crop necessarily starts from
// the first crop's result, not a separately preserved original).
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

// Shared by every asset-mutating endpoint below: confirms the question is
// in the caller's workspace (same check every other question route
// makes), then loads the asset row. Any diagram can be cropped now -
// there's no longer a separate "no original to crop against" state (that
// was specific to the two-file design this reverses).
async function loadAsset(questionId, workspaceId) {
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

  return asset;
}

export async function updateDiagramCrop(req, res) {
  const rect = parseCropRect(req.body);
  const asset = await loadAsset(req.params.questionId, req.workspaceId);

  const currentImage = await fetchDiagramBuffer(
    asset.storagePath,
    assetCacheVersion(asset.createdAt),
  );

  let cropped;
  try {
    cropped = await sharp(currentImage)
      .extract({
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      })
      .toBuffer();
  } catch (error) {
    // sharp throws a generic Error (not one of ours) when the rect falls
    // outside the source image's bounds - the one way this request can be
    // malformed in a way parseCropRect can't catch up front, since it has
    // no idea how big the current image actually is.
    throw httpError(400, "Crop rectangle is outside the image bounds");
  }

  // overwrite: true (see cloudinary-storage.js#uploadDiagramBuffer) means
  // this re-uploads under the SAME public_id the asset already has. The
  // DB row's storage_path stays put; created_at is bumped so the next
  // diagramUrl / Cloudinary /v<version>/ actually points at these bytes.
  await uploadDiagramBuffer(cropped, asset.storagePath);
  await questionAssetsRepo.touchAsset(asset.id);

  res.json({ success: true });
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

  if (!req.file.buffer || req.file.buffer.length === 0) {
    throw httpError(400, "Uploaded file is empty");
  }

  // Fail fast with a clear message before any image work when Cloudinary
  // is missing from the environment — otherwise the user only sees a
  // generic 502 after sharp has already processed the file.
  if (!isCloudinaryConfigured()) {
    throw httpError(
      503,
      "Cloud image storage (Cloudinary) is not configured on the server",
    );
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
  // to the default).
  const previousAsset = await questionAssetsRepo.findAssetForQuestion(
    req.params.questionId,
  );

  let normalizedPng;
  try {
    // Re-encode through sharp rather than trusting the uploaded bytes
    // as-is - strips EXIF, normalizes to PNG regardless of whether the
    // upload was a JPEG/WEBP, and gives a clean 400 instead of a corrupt
    // upload if what came through fileFilter's mimetype check isn't
    // actually a decodable image.
    normalizedPng = await sharp(req.file.buffer).png().toBuffer();
  } catch (error) {
    console.error("sharp failed to process uploaded diagram:", error);
    throw httpError(
      400,
      "Could not process this image. Use a valid PNG, JPEG, or WebP file",
    );
  }

  // Deliberately the SAME public_id an extracted diagram for this exact
  // question would get (see asset_extractor.py#build_diagram_public_id,
  // which this mirrors) - a manual upload always overwrites in place at
  // that one predictable location, extracted or manual, so there's no
  // separate "clean up the old file" step needed the way the old
  // local-disk version required (an extracted asset and a manual one used
  // to live in genuinely different directories).
  const publicId = buildDiagramPublicId(
    req.workspaceId,
    question.mock_test_id,
    question.id,
  );

  try {
    await uploadDiagramBuffer(normalizedPng, publicId);
  } catch (error) {
    // uploadDiagramBuffer already maps Cloudinary failures to httpError(502).
    console.error(
      `uploadDiagramImage failed for question ${question.id} (publicId=${publicId}):`,
      error,
    );
    throw error;
  }

  try {
    await questionAssetsRepo.replaceAssetForQuestion(question.id, {
      storagePath: publicId,
      source: "manual",
      placement: previousAsset?.placement || "below_text",
    });
  } catch (error) {
    // Cloudinary already holds the new bytes under publicId. Log and surface
    // a clear server error rather than a silent partial success.
    console.error(
      `Diagram uploaded to Cloudinary but DB replace failed for question ${question.id}:`,
      error,
    );
    throw httpError(
      500,
      "Image was uploaded but could not be linked to this question. Please try again",
    );
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
// do (the old crop DELETE only reset to auto-crop; it never had a way to
// end up with zero diagrams again). Lets an editor undo an accidental
// upload, or clear a bad extraction before uploading their own replacement.
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
  await deleteDiagram(asset.storagePath);

  res.status(204).send();
}
