import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import { generateDiagramAccessToken } from "../lib/diagram-signed-url.js";
import {
  assetCacheVersion,
  buildDiagramPublicId,
  fetchDiagramBuffer,
  uploadDiagramBuffer,
  isValidDiagramPublicId,
} from "../lib/cloudinary-storage.js";

function buildDiagramUrl(
  questionId,
  workspaceId,
  { shareToken, version } = {},
) {
  const token = generateDiagramAccessToken(questionId, workspaceId);
  const versionQuery =
    version != null && version !== "" ? `&v=${encodeURIComponent(version)}` : "";
  return shareToken
    ? `/api/shared/${shareToken}/questions/${questionId}/diagram?access_token=${token}${versionQuery}`
    : `/api/questions/${questionId}/diagram?access_token=${token}${versionQuery}`;
}

// Enriches a list of question-like objects with a diagramUrl, for
// whichever ones actually have a saved asset. Questions without one are
// left untouched - no diagramUrl key at all, which every frontend
// component already treats as "no diagram" via `{q.diagramUrl && (...)}`.
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
    const asset = id ? assetsByQuestionId.get(id) : null;
    if (!asset) {
      return question;
    }
    // Stale pre-Cloudinary rows (see cloudinary-storage.js#isValidDiagramPublicId)
    // get treated the same as "no diagram" here rather than handed to
    // the frontend as a diagramUrl that's guaranteed to 400 - same
    // silent-failure shape a genuinely missing asset already gets, not a
    // new kind of broken state to handle.
    if (!isValidDiagramPublicId(asset.storagePath)) {
      console.warn(
        `Skipping diagramUrl for question ${id}: question_assets.storage_path is not a valid Cloudinary public_id (${asset.storagePath}). This question likely needs its diagram re-extracted or re-uploaded.`,
      );
      return question;
    }
    return {
      ...question,
      // ?v=<created_at unix> is the browser-cache key. Replace DELETE+INSERTs
      // a new row (new created_at); crop bumps created_at via touchAsset.
      // Without this, <img src> stays identical after a successful replace
      // and the previous PNG stays on screen.
      diagramUrl: buildDiagramUrl(id, workspaceId, {
        shareToken,
        version: assetCacheVersion(asset.createdAt),
      }),
      // Read by every QuestionContent consumer (exam-play, results,
      // review, editor alike) to decide above_text/below_text/below_options
      // rendering - not editor-only like `source` below, so it belongs on
      // this shared helper rather than the sibling.
      placement: asset.placement,
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
    const asset = id ? assetsByQuestionId.get(id) : null;
    if (!asset) {
      return question;
    }
    // source drives DiagramUploadControl's confirm-before-replace copy
    // ("replace the extracted diagram" vs "replace your uploaded image"),
    // which has no equivalent in the exam-play/shared-attempt views
    // attachDiagramUrls alone serves.
    return { ...question, source: asset.source };
  });
}

// Used by question-bank.service.js#copyQuestionToMockTest - a copy is
// meaningless if it silently loses its diagram, but this is real file
// I/O (not something the pure-DB question-bank.repository.js should be
// doing), so it lives here alongside every other diagram-file operation
// in this codebase, called as its own step after the question row copy
// commits, the same "DB row first, files after, best-effort on the file
// half" ordering worker.py already uses for extracted diagrams (see
// worker.py's pending_diagram_writes) - a question that copied correctly
// but whose diagram failed to clone should still exist as a valid
// question, just without its image, rather than the whole copy failing
// over a file-copy error.
//
// No-op (returns without doing anything) when the source question has no
// asset at all - most copied questions won't.
export async function cloneDiagramAsset({
  sourceQuestionId,
  targetQuestionId,
  targetMockTestId,
  targetWorkspaceId,
}) {
  const sourceAsset =
    await questionAssetsRepo.findAssetForQuestion(sourceQuestionId);
  if (!sourceAsset) {
    return;
  }

  // sourceAsset.storagePath is a Cloudinary public_id, not a filesystem
  // path (see cloudinary-storage.js) - "cloning" means downloading the
  // source's bytes and re-uploading them under the target question's own
  // public_id, since Cloudinary has no server-side "copy this asset to a
  // new id" primitive that avoids the round-trip anyway.
  const imageBytes = await fetchDiagramBuffer(
    sourceAsset.storagePath,
    assetCacheVersion(sourceAsset.createdAt),
  );
  const publicId = buildDiagramPublicId(
    targetWorkspaceId,
    targetMockTestId,
    targetQuestionId,
  );
  await uploadDiagramBuffer(imageBytes, publicId);

  // source/placement carried over as-is - the pixels are identical to
  // what the source asset already was, so there's nothing to reclassify
  // here.
  await questionAssetsRepo.replaceAssetForQuestion(targetQuestionId, {
    storagePath: publicId,
    source: sourceAsset.source,
    placement: sourceAsset.placement,
    pageNumber: null,
  });
}
