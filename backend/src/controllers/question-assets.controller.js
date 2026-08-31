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
  isValidDiagramPublicId,
  uploadDiagramBuffer,
} from "../lib/cloudinary-storage.js";
import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import * as questionAssetsService from "../services/question-assets.service.js";
import * as questionsRepo from "../repositories/questions.repository.js";
import * as sharedService from "../services/shared.service.js";

// Same shape as migration 038's own DB-level CHECK constraint
// (question_assets_slot_key_format) - validated here too so a bad slot
// key in a URL gets a real 400 with an explanation instead of a raw
// Postgres constraint-violation error bubbling up.
const SLOT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function resolveSlotKey(rawSlotKey) {
  const slotKey = rawSlotKey || "default";
  if (!SLOT_KEY_RE.test(slotKey)) {
    throw httpError(
      400,
      "slotKey must be lowercase letters, digits, and hyphens only",
    );
  }
  return slotKey;
}

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

  const slotKey = resolveSlotKey(req.params.slotKey);
  const asset = await questionAssetsRepo.findAssetForSlot(questionId, slotKey);
  if (!isCloudinaryConfigured()) {
    throw httpError(
      503,
      "Cloud image storage (Cloudinary) is not configured on the server",
    );
  }

  if (!asset?.storagePath) {
    // A valid, unexpired token for a question/slot that has no (or no
    // longer has) a saved diagram - treat exactly like "not found", not a
    // server error. Can legitimately happen if a mock test was
    // reprocessed between the page loading and the image request landing.
    throw httpError(404, "No diagram found for this question");
  }
  if (!isValidDiagramPublicId(asset.storagePath)) {
    throw httpError(404, "No usable diagram found for this question");
  }

  // asset.storagePath holds a Cloudinary public_id, not a filesystem path
  // (see worker/cloudinary_storage.py and this file's uploadDiagramImage
  // below, which both write the same kind of value into that column - the
  // name stuck around across the storage migration rather than renaming
  // the DB column, since it's still, structurally, "where this asset is
  // stored"). The access_token check above is this endpoint's entire
  // authorization; once it passes, a redirect straight to Cloudinary's
  // CDN is strictly better than proxying the bytes back through this
  // server - one less hop, and Cloudinary's own caching/CDN edge serves
  // the actual image.
  res.setHeader("Cache-Control", "private, no-cache");
  res.redirect(
    302,
    diagramUrlForPublicId(
      asset.storagePath,
      assetCacheVersion(asset.createdAt),
    ),
  );
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
// (see migration 029_diagram_single_image.sql: there's only ever one
// stored image per SLOT now, so a second crop necessarily starts from
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
// makes), then loads the asset row for ONE specific slot. Any diagram can
// be cropped now - there's no longer a separate "no original to crop
// against" state (that was specific to the two-file design migration 029
// reversed).
async function loadAsset(questionId, workspaceId, slotKey) {
  const question = await questionsRepo.findQuestionById(
    questionId,
    workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

  const asset = await questionAssetsRepo.findAssetForSlot(questionId, slotKey);
  if (!asset) {
    throw httpError(404, "No diagram found for this question/slot");
  }

  return { question, asset };
}

// Lists every slot this question has - the data source for the editor's
// "Manage Images" panel (see the ImageSlotManager component): which slot
// keys exist, what each one's current image looks like, and whether it
// was extracted or manually uploaded, so an editor can review/replace/
// delete any of them, or see at a glance which slot key is still free to
// reference from a new ![[img:slot-key]] marker.
export async function listQuestionAssets(req, res) {
  const question = await questionsRepo.findQuestionById(
    req.params.questionId,
    req.workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

  const assets = (
    await questionAssetsRepo.findAssetsForQuestion(question.id)
  ).filter((asset) => isValidDiagramPublicId(asset.storagePath));
  res.json({
    assets: assets.map((asset) => ({
      slotKey: asset.slotKey,
      url: questionAssetsService.buildDiagramUrl(
        question.id,
        asset.slotKey,
        req.workspaceId,
        { version: assetCacheVersion(asset.createdAt) },
      ),
      source: asset.source,
    })),
  });
}

export async function updateDiagramCrop(req, res) {
  const slotKey = resolveSlotKey(req.params.slotKey);
  const rect = parseCropRect(req.body);
  const { asset } = await loadAsset(
    req.params.questionId,
    req.workspaceId,
    slotKey,
  );

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
  // this re-uploads under the SAME public_id the asset already has - no
  // DB row change needed, exactly mirroring the old write-to-the-same-path
  // behavior this replaces.
  await uploadDiagramBuffer(cropped, asset.storagePath);
  await questionAssetsRepo.touchAsset(asset.id);

  res.json({ success: true });
}

// Part C: manual image insert, now for one specific slot. Handles both
// "this slot has no diagram at all yet" (a brand-new slot key, or
// extraction never found one for 'default') and "replace whatever image
// this slot has now" (extracted or manual, per the original plan's
// decision to allow replacing either) - the same upload does both, since
// upsertAssetForSlot is an INSERT ... ON CONFLICT DO UPDATE scoped to
// exactly this (question_id, slot_key) pair, never touching any other
// slot the question has.
export async function uploadDiagramImage(req, res) {
  if (!req.file) {
    throw httpError(400, "Missing image file");
  }
  if (!req.file.buffer || req.file.buffer.length === 0) {
    throw httpError(400, "Uploaded file is empty");
  }
  if (!isCloudinaryConfigured()) {
    throw httpError(
      503,
      "Cloud image storage (Cloudinary) is not configured on the server",
    );
  }

  const slotKey = resolveSlotKey(req.params.slotKey);

  const question = await questionsRepo.findQuestionById(
    req.params.questionId,
    req.workspaceId,
  );
  if (!question) {
    throw httpError(404, "Question not found");
  }

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
  // question+slot would get (see worker/cloudinary_storage.py's
  // build_diagram_public_id, which this mirrors) - a manual upload always
  // overwrites in place at that one predictable location, extracted or
  // manual, so there's no separate "clean up the old file" step needed.
  const publicId = buildDiagramPublicId(
    req.workspaceId,
    question.mock_test_id,
    question.id,
    slotKey,
  );

  try {
    await uploadDiagramBuffer(normalizedPng, publicId);
  } catch (error) {
    console.error(
      `uploadDiagramImage failed for question ${question.id} (publicId=${publicId}):`,
      error,
    );
    throw error;
  }

  try {
    await questionAssetsRepo.upsertAssetForSlot(question.id, slotKey, {
      storagePath: publicId,
      source: "manual",
    });
  } catch (error) {
    console.error(
      `Diagram uploaded to Cloudinary but DB upsert failed for question ${question.id}:`,
      error,
    );
    throw httpError(
      500,
      "Image was uploaded but could not be linked to this question. Please try again",
    );
  }

  res.status(201).json({ success: true, slotKey });
}

// Removes one slot's diagram entirely. Lets an editor undo an accidental
// upload, or clear a bad extraction before uploading their own
// replacement, or remove a slot that's no longer referenced by any
// ![[img:slot-key]] marker after an edit.
export async function deleteDiagramImage(req, res) {
  const slotKey = resolveSlotKey(req.params.slotKey);
  const { asset } = await loadAsset(
    req.params.questionId,
    req.workspaceId,
    slotKey,
  );

  await questionAssetsRepo.deleteAssetForSlot(req.params.questionId, slotKey);
  await deleteDiagram(asset.storagePath);

  res.status(204).send();
}
