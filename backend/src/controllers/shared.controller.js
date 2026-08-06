import * as sharedService from "../services/shared.service.js";

// --- Authenticated: managing share links for a mock test ---

export async function createShareLink(req, res) {
  const share = await sharedService.createOrGetShareLink({
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
    expiresAt: req.body.expiresAt || null,
  });
  res.status(201).json({ share });
}

export async function listShares(req, res) {
  const shares = await sharedService.listShares({
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
  });
  res.json({ shares });
}

export async function revokeShareLink(req, res) {
  await sharedService.revokeShareLink({
    shareId: req.params.shareId,
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
  });
  res.status(204).send();
}

// --- Public: taking a shared mock test, no auth required ---

export async function getSharedMockTest(req, res) {
  const result = await sharedService.getSharedMockTest(req.params.token);
  res.json(result);
}

export async function startSharedAttempt(req, res) {
  const result = await sharedService.startSharedAttempt({
    shareToken: req.params.token,
    guestName: req.body.guestName,
  });
  res.status(201).json(result);
}

export async function saveSharedAnswer(req, res) {
  const answer = await sharedService.saveSharedAnswer({
    shareToken: req.params.token,
    attemptId: req.params.attemptId,
    questionId: req.params.questionId,
    selectedOptionIndexes: req.body.selectedOptionIndexes,
  });
  res.json({ answer });
}

export async function submitSharedAttempt(req, res) {
  const attempt = await sharedService.submitSharedAttempt({
    shareToken: req.params.token,
    attemptId: req.params.attemptId,
  });
  res.json({ attempt });
}

export async function getSharedAttempt(req, res) {
  const result = await sharedService.getSharedAttempt({
    shareToken: req.params.token,
    attemptId: req.params.attemptId,
  });
  res.json(result);
}
