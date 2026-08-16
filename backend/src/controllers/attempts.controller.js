import * as attemptsService from "../services/attempts.service.js";

export async function start(req, res) {
  const result = await attemptsService.startAttempt({
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
    userId: req.user.id,
    // Query param, not body - matches OverviewTab.jsx's existing
    // /session/:id?topic=X link, which this endpoint's URL is reached
    // from directly with no client-side transformation needed.
    topic: req.query.topic,
    metadata: { source: "workspace" },
  });
  res.status(201).json(result);
}

export async function listForMockTest(req, res) {
  const attempts = await attemptsService.listAttemptsForMockTest({
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
    userId: req.user.id,
  });
  res.json({ attempts });
}

// Owner-facing - see require-role.js gating on this route (editor+ only,
// same bar as managing share links) since this exposes every taker's
// name and score, not just the requesting user's own.
export async function listSubmissionsForMockTest(req, res) {
  const submissions = await attemptsService.listAllAttemptsForMockTest({
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
  });
  res.json({ submissions });
}

export async function listMine(req, res) {
  // Personal history, not workspace-scoped - see listMyAttempts.
  const attempts = await attemptsService.listMyAttempts({
    userId: req.user.id,
  });
  res.json({ attempts });
}

export async function getOne(req, res) {
  const result = await attemptsService.getAttempt({
    attemptId: req.params.attemptId,
    userId: req.user.id,
  });
  res.json(result);
}

export async function remove(req, res) {
  const attempt = await attemptsService.deleteAttempt({
    attemptId: req.params.attemptId,
    userId: req.user.id,
  });
  res.json({ attempt });
}

export async function saveAnswer(req, res) {
  const answer = await attemptsService.saveAnswer({
    attemptId: req.params.attemptId,
    workspaceId: req.workspaceId,
    questionId: req.params.questionId,
    selectedOptionIndexes: req.body.selectedOptionIndexes,
  });
  res.json({ answer });
}

export async function submit(req, res) {
  const attempt = await attemptsService.submitAttempt({
    attemptId: req.params.attemptId,
    workspaceId: req.workspaceId,
  });
  res.json({ attempt });
}

export async function abandon(req, res) {
  const attempt = await attemptsService.abandonAttempt({
    attemptId: req.params.attemptId,
    workspaceId: req.workspaceId,
  });
  res.json({ attempt });
}
