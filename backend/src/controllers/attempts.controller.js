import * as attemptsService from "../services/attempts.service.js";

export async function start(req, res) {
  const result = await attemptsService.startAttempt({
    mockTestId: req.params.mockTestId,
    workspaceId: req.workspaceId,
    userId: req.user.id,
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

export async function listMine(req, res) {
  const attempts = await attemptsService.listMyAttempts({
    userId: req.user.id,
    workspaceId: req.workspaceId,
  });
  res.json({ attempts });
}

export async function getOne(req, res) {
  const result = await attemptsService.getAttempt({
    attemptId: req.params.attemptId,
    workspaceId: req.workspaceId,
  });
  res.json(result);
}

export async function remove(req, res) {
  const attempt = await attemptsService.deleteAttempt({
    attemptId: req.params.attemptId,
    workspaceId: req.workspaceId,
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
