import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import { generateDiagramAccessToken } from "../lib/diagram-signed-url.js";
import {
  assetCacheVersion,
  buildDiagramPublicId,
  fetchDiagramBuffer,
  isValidDiagramPublicId,
  uploadDiagramBuffer,
} from "../lib/cloudinary-storage.js";

// Exported so the controller's listQuestionAssets can reuse the exact
// same URL shape attachDiagramUrls already builds for question-list
// responses, rather than a second, easy-to-drift-apart implementation.
//
// slotKey deliberately NOT part of the signed token payload (see
// diagram-signed-url.js) - the token's whole job is proving "you're
// allowed to see THIS QUESTION's assets", not which specific slot within
// it. Adding slotKey to the URL path is enough; the token stays scoped to
// questionId exactly as it always has, so one token still covers every
// slot a question has.
export function buildDiagramUrl(
  questionId,
  slotKey,
  workspaceId,
  { shareToken, version } = {},
) {
  const token = generateDiagramAccessToken(questionId, workspaceId);
  const suffix = slotKey === "default" ? "" : `/${slotKey}`;
  const versionQuery =
    version != null && version !== "" ? `&v=${encodeURIComponent(version)}` : "";
  return shareToken
    ? `/api/shared/${shareToken}/questions/${questionId}/diagram${suffix}?access_token=${token}${versionQuery}`
    : `/api/questions/${questionId}/diagram${suffix}?access_token=${token}${versionQuery}`;
}

// Enriches a list of question-like objects with diagram info, for
// whichever ones actually have at least one saved asset. Questions
// without any are left untouched - no diagramUrl/diagramAssets keys at
// all, which every frontend component already treats as "no diagram" via
// `{q.diagramUrl && (...)}`.
//
// Two things get attached, deliberately kept alongside each other rather
// than one replacing the other:
// - diagramUrl/placement (unchanged shape, 'default' slot only) - every
//   existing consumer that only ever knew about one image per question
//   (QuestionContent's diagramUrl prop, DiagramUploadControl, etc.) keeps
//   working exactly as before, with zero changes on their end.
// - diagramAssets (new) - EVERY slot this question has, each with its own
//   resolved URL, for MathText's ![[img:slot-key]] marker resolution
//   (see MathText.jsx) to pull the right image for a marker anywhere in
//   the text/options/table cells, not just the single default slot.
//
// idField exists because this codebase's three question-listing call
// sites don't share one field name for a question's own id:
// attempts/mock-tests-play flows map it to `questionId`, but the
// editor's listQuestions returns raw `SELECT q.*` rows where it's just
// `id`. Defaulting to "questionId" and letting the editor pass "id"
// keeps this one shared helper instead of three near-duplicate ones.
//
// shareToken, when provided, routes the generated URL through the public
// /api/shared/:token/... path instead of the authenticated
// /api/questions/... path - used for the shared/anonymous test-taking
// flow, which never has an Authorization header to fall back on.
export async function attachDiagramUrls(
  questions,
  workspaceId,
  { shareToken, idField = "questionId" } = {},
) {
  const questionIds = questions.map((q) => q[idField]).filter(Boolean);
  if (questionIds.length === 0) {
    return questions;
  }

  const assetsByQuestionId =
    await questionAssetsRepo.findAssetsForQuestions(questionIds);

  return questions.map((question) => {
    const id = question[idField];
    const assets = (id ? assetsByQuestionId.get(String(id)) : null)?.filter((asset) =>
      isValidDiagramPublicId(asset.storagePath),
    );
    if (!assets || assets.length === 0) {
      return question;
    }

    const diagramAssets = assets.map((asset) => ({
      slotKey: asset.slotKey,
      url: buildDiagramUrl(id, asset.slotKey, workspaceId, {
        shareToken,
        version: assetCacheVersion(asset.createdAt),
      }),
      placement: asset.placement,
    }));

    const defaultAsset = assets.find((asset) => asset.slotKey === "default");
    if (!defaultAsset) {
      // A question with only non-default slots (every image referenced
      // by an inline marker, none of them the legacy single-image slot) -
      // no diagramUrl/placement to attach, but diagramAssets still carries
      // everything MathText needs to resolve those markers.
      return { ...question, diagramAssets };
    }

    return {
      ...question,
      diagramUrl: buildDiagramUrl(id, "default", workspaceId, {
        shareToken,
        version: assetCacheVersion(defaultAsset.createdAt),
      }),
      // Read by every QuestionContent consumer (exam-play, results,
      // review, editor alike) to decide above_text/below_text/below_options
      // rendering - not editor-only like `source` below, so it belongs on
      // this shared helper rather than the sibling.
      placement: defaultAsset.placement,
      diagramAssets,
    };
  });
}

// Sibling to attachDiagramUrls, deliberately NOT folded into it: this is
// only ever called from the editor's listQuestions path
// (mock-tests.service.js#listQuestions), never from the exam-play or
// shared-attempt paths above, which have no use for `source` at all.
//
// Used to also attach a diagramOriginalUrl/hasManualCrop pair for
// DiagramCropModal to crop against a separate pristine "original" image -
// removed along with that whole two-file-per-diagram design (see
// migration 022_diagram_single_image.sql). The editor's "Edit Crop" now
// crops directly against the same diagramUrl attachDiagramUrls above
// already provides, so this function's only remaining job is `source`.
//
// Attaches source per-slot on each diagramAssets entry, not just a single
// top-level `source` - the editor's multi-image manager (see the Manage
// Images panel) needs to show extracted-vs-manual per slot independently,
// same as it always could for the single default slot.
export async function attachDiagramSource(
  questions,
  { idField = "questionId" } = {},
) {
  const questionIds = questions.map((q) => q[idField]).filter(Boolean);
  if (questionIds.length === 0) {
    return questions;
  }

  const assetsByQuestionId =
    await questionAssetsRepo.findAssetsForQuestions(questionIds);

  return questions.map((question) => {
    const id = question[idField];
    const assets = id ? assetsByQuestionId.get(String(id)) : null;
    if (!assets || assets.length === 0) {
      return question;
    }

    const defaultAsset = assets.find((asset) => asset.slotKey === "default");
    const sourceBySlot = Object.fromEntries(
      assets.map((asset) => [asset.slotKey, asset.source]),
    );

    return {
      ...question,
      // source drives DiagramUploadControl's confirm-before-replace copy
      // ("replace the extracted diagram" vs "replace your uploaded
      // image") for the default slot specifically.
      ...(defaultAsset ? { source: defaultAsset.source } : {}),
      diagramSourceBySlot: sourceBySlot,
    };
  });
}

// Used by question-bank.service.js#copyQuestionToMockTest - a copy is
// meaningless if it silently loses its diagrams, but this is real file
// I/O (not something the pure-DB question-bank.repository.js should be
// doing), so it lives here alongside every other diagram-file operation
// in this codebase, called as its own step after the question row copy
// commits, the same "DB row first, files after, best-effort on the file
// half" ordering worker.py uses for extracted diagrams - a question that
// copied correctly but whose diagram failed to clone should still exist
// as a valid question, just without that image, rather than the whole
// copy failing over a file-copy error.
//
// Clones EVERY slot the source question has, not just 'default' - a
// question with a 3-image List-I/List-II table needs all 3 to come along
// with the copy, or the copy silently ends up with holes in its table.
// One slot's clone failing doesn't stop the others - matches the
// per-diagram best-effort stance the rest of this function already takes.
//
// No-op (returns without doing anything) when the source question has no
// assets at all - most copied questions won't.
export async function cloneDiagramAssets({
  sourceQuestionId,
  targetQuestionId,
  targetMockTestId,
  targetWorkspaceId,
}) {
  const sourceAssets =
    await questionAssetsRepo.findAssetsForQuestion(sourceQuestionId);
  if (sourceAssets.length === 0) {
    return;
  }

  for (const sourceAsset of sourceAssets) {
    try {
      // sourceAsset.storagePath is a Cloudinary public_id, not a
      // filesystem path (see cloudinary-storage.js) - "cloning" means
      // downloading the source's bytes and re-uploading them under the
      // target question's own public_id (now including slot_key, so
      // different slots never collide at the same Cloudinary location),
      // since Cloudinary has no server-side "copy this asset to a new id"
      // primitive that avoids the round-trip anyway.
      const imageBytes = await fetchDiagramBuffer(sourceAsset.storagePath);
      const publicId = buildDiagramPublicId(
        targetWorkspaceId,
        targetMockTestId,
        targetQuestionId,
        sourceAsset.slotKey,
      );
      await uploadDiagramBuffer(imageBytes, publicId);

      // source/placement carried over as-is - the pixels are identical to
      // what the source asset already was, so there's nothing to
      // reclassify here.
      await questionAssetsRepo.upsertAssetForSlot(
        targetQuestionId,
        sourceAsset.slotKey,
        {
          storagePath: publicId,
          source: sourceAsset.source,
          placement: sourceAsset.placement,
          pageNumber: null,
        },
      );
    } catch (error) {
      console.error(
        `Failed to clone diagram asset (slot "${sourceAsset.slotKey}") from ${sourceQuestionId} to ${targetQuestionId}:`,
        error,
      );
    }
  }
}
