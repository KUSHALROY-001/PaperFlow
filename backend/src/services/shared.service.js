import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import crypto from "node:crypto";
import * as sharedRepo from "../repositories/shared.repository.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import * as attemptsService from "./attempts.service.js";

function generateShareToken() {
  // 24 random bytes -> 32 url-safe base64 chars. Long enough that guessing
  // a token by brute force isn't remotely practical, short enough to
  // comfortably fit in a URL.
  return crypto.randomBytes(24).toString("base64url");
}

export async function createOrGetShareLink({
  mockTestId,
  workspaceId,
  expiresAt,
}) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }
  if (mockTest.status !== "published") {
    throw httpError(
      400,
      "Only a published mock test can be shared - publish it first",
    );
  }

  const existing = await sharedRepo.findActiveShareForMockTest(mockTestId);
  if (existing) {
    return serializeShare(existing);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const share = await sharedRepo.insertShare(client, {
      mockTestId,
      shareToken: generateShareToken(),
      expiresAt: expiresAt || null,
    });
    await client.query("COMMIT");
    return serializeShare(share);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listShares({ mockTestId, workspaceId }) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const shares = await sharedRepo.listSharesForMockTest(mockTestId);
  return shares.map(serializeShare);
}

export async function revokeShareLink({ shareId, mockTestId, workspaceId }) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const revoked = await sharedRepo.deactivateShare(shareId, mockTestId);
  if (!revoked) {
    throw httpError(404, "Share link not found");
  }
}

// Resolves and validates a token, throwing a generic 404 either way whether
// the token never existed or has just expired/been revoked - not
// distinguishing those cases in the response avoids giving a scanner any
// signal about which tokens are "close" to valid.
async function resolveShare(shareToken) {
  const share = await sharedRepo.findValidShareByToken(shareToken);
  if (!share) {
    throw httpError(
      404,
      "This share link is invalid, expired, or has been revoked",
    );
  }
  return share;
}

// Used by the public diagram-serving route: resolving through the same
// share-validity check as every other shared endpoint means a revoked or
// expired share also immediately stops serving that test's diagram
// images, not just its questions/attempts.
export async function resolveWorkspaceForShareToken(shareToken) {
  const share = await resolveShare(shareToken);
  return share.workspace_id;
}

export async function getSharedMockTest(shareToken) {
  const share = await resolveShare(shareToken);
  const questions = await mockTestsRepo.listPlayableQuestions(
    share.mock_test_id,
  );

  return {
    mockTest: {
      id: share.mock_test_id,
      name: share.mock_test_name,
      description: share.mock_test_description,
      durationMinutes: share.duration_minutes,
      marksPerCorrect: Number(share.marks_per_correct),
      negativeMarking: Number(share.negative_marks_per_wrong),
      totalQuestions: share.total_questions,
    },
    questionCount: questions.length,
  };
}

export async function startSharedAttempt({ shareToken, guestName }) {
  const share = await resolveShare(shareToken);

  return attemptsService.startAttempt({
    mockTestId: share.mock_test_id,
    workspaceId: share.workspace_id,
    userId: null,
    metadata: {
      source: "shared_link",
      shareToken,
      guestName: guestName || null,
    },
  });
}

export async function saveSharedAnswer({
  shareToken,
  attemptId,
  questionId,
  selectedOptionIndexes,
}) {
  const share = await resolveShare(shareToken);

  return attemptsService.saveAnswer({
    attemptId,
    workspaceId: share.workspace_id,
    questionId,
    selectedOptionIndexes,
  });
}

export async function submitSharedAttempt({ shareToken, attemptId }) {
  const share = await resolveShare(shareToken);

  return attemptsService.submitAttempt({
    attemptId,
    workspaceId: share.workspace_id,
  });
}

// Mirrors member-mode's abandon (see attempts.controller.js#abandon) so a
// guest who cancels mid-session doesn't leave a permanently-stuck
// 'in_progress' attempt behind - it'd otherwise sit forever in the mock
// test owner's Submissions tab looking like someone is still taking it.
export async function abandonSharedAttempt({ shareToken, attemptId }) {
  const share = await resolveShare(shareToken);

  return attemptsService.abandonAttempt({
    attemptId,
    workspaceId: share.workspace_id,
  });
}

export async function getSharedAttempt({ shareToken, attemptId }) {
  const share = await resolveShare(shareToken);

  return attemptsService.getAttempt({
    attemptId,
    workspaceId: share.workspace_id,
    shareToken,
  });
}

export async function claimSharedAttempt({ shareToken, attemptId, userId }) {
  const share = await resolveShare(shareToken);

  return attemptsService.claimAttempt({
    attemptId,
    mockTestId: share.mock_test_id,
    shareToken,
    userId,
  });
}

function serializeShare(row) {
  return {
    id: row.id,
    mockTestId: row.mock_test_id,
    shareToken: row.share_token,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
