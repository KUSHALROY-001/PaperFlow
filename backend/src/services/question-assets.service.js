import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import { generateDiagramAccessToken } from "../lib/diagram-signed-url.js";

function buildDiagramUrl(questionId, workspaceId, { shareToken } = {}) {
  const token = generateDiagramAccessToken(questionId, workspaceId);
  return shareToken
    ? `/api/shared/${shareToken}/questions/${questionId}/diagram?access_token=${token}`
    : `/api/questions/${questionId}/diagram?access_token=${token}`;
}

function buildDiagramOriginalUrl(questionId, workspaceId) {
  const token = generateDiagramAccessToken(questionId, workspaceId);
  return `/api/questions/${questionId}/diagram-original?access_token=${token}`;
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
    return {
      ...question,
      diagramUrl: buildDiagramUrl(id, workspaceId, { shareToken }),
      // Read by every QuestionContent consumer (exam-play, results,
      // review, editor alike) to decide above_text/below_text/below_options
      // rendering - not editor-only like diagramOriginalUrl/source below,
      // so it belongs on this shared helper rather than the sibling.
      placement: asset.placement,
    };
  });
}

// Sibling to attachDiagramUrls, deliberately NOT folded into it behind an
// includeOriginal flag: this is only ever called from the editor's
// listQuestions path (mock-tests.service.js#listQuestions), never from the
// exam-play or shared-attempt paths above, which have no use for the
// oversized pre-crop original and shouldn't pay for minting a second signed
// token per question on every attempt-start.
//
// Unlike diagramUrl, a question can be missing diagramOriginalUrl even when
// it HAS a diagram - assets extracted before migration 014 shipped have no
// original_storage_path to point to. That absence is exactly the signal
// DiagramCropModal's "Edit Crop" button checks to disable itself, so it's
// left unset rather than pointed at a route that would 404.
export async function attachDiagramOriginalUrls(
  questions,
  workspaceId,
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
    // source is only meaningful here (editor-only) - it drives
    // DiagramUploadControl's confirm-before-replace copy ("replace the
    // extracted diagram" vs "replace your uploaded image"), which has no
    // equivalent in the exam-play/shared-attempt views attachDiagramUrls
    // alone serves.
    const withSource = { ...question, source: asset.source };
    if (!asset.originalStoragePath) {
      return withSource;
    }
    return {
      ...withSource,
      diagramOriginalUrl: buildDiagramOriginalUrl(id, workspaceId),
      hasManualCrop: asset.hasManualCrop,
    };
  });
}
