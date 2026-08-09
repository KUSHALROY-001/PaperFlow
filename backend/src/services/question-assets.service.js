import * as questionAssetsRepo from "../repositories/question-assets.repository.js";
import { generateDiagramAccessToken } from "../lib/diagram-signed-url.js";

function buildDiagramUrl(questionId, workspaceId, { shareToken } = {}) {
  const token = generateDiagramAccessToken(questionId, workspaceId);
  return shareToken
    ? `/api/shared/${shareToken}/questions/${questionId}/diagram?access_token=${token}`
    : `/api/questions/${questionId}/diagram?access_token=${token}`;
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
export async function attachDiagramUrls(questions, workspaceId, { shareToken, idField = "questionId" } = {}) {
  const questionIds = questions.map((q) => q[idField]).filter(Boolean);
  if (questionIds.length === 0) {
    return questions;
  }

  const assetsByQuestionId = await questionAssetsRepo.findAssetsForQuestions(questionIds);

  return questions.map((question) => {
    const id = question[idField];
    if (!id || !assetsByQuestionId.has(id)) {
      return question;
    }
    return {
      ...question,
      diagramUrl: buildDiagramUrl(id, workspaceId, { shareToken }),
    };
  });
}
