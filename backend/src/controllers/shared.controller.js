import * as sharedService from "../services/shared.service.js";
import { requiredString } from "../lib/validators.js";

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
  // req.query.topics can be a single string or an array depending on how
  // many "topics=" params were in the URL (Express's default query
  // parser) - normalize to an array either way.
  const topics = req.query.topics
    ? [].concat(req.query.topics)
    : undefined;
  const result = await sharedService.getSharedMockTest(
    req.params.token,
    topics,
  );
  res.json(result);
}

export async function startSharedAttempt(req, res) {
  const result = await sharedService.startSharedAttempt({
    shareToken: req.params.token,
    guestName: req.body.guestName,
    // Required (not optionalString) - this is the one behavior change
    // guests see: an extra field before starting a test. Without a
    // required email, some attempts stay permanently unlinkable to any
    // student record, which defeats the point of the roster this powers
    // (see students.repository.js). requiredString also lowercases-trims
    // nothing itself, but taker_email is CITEXT (case-insensitive
    // compare) so "Name@X.com" and "name@x.com" still group together.
    guestEmail: requiredString(req.body.guestEmail, "guestEmail"),
    topics: req.body.topics,
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

export async function abandonSharedAttempt(req, res) {
  const attempt = await sharedService.abandonSharedAttempt({
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

// --- Authenticated: linking an already-submitted guest attempt to an account ---

export async function claimSharedAttempt(req, res) {
  const attempt = await sharedService.claimSharedAttempt({
    shareToken: req.params.token,
    attemptId: req.params.attemptId,
    userId: req.user.id,
  });
  res.json({ attempt });
}
