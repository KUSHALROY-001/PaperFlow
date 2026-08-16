import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import * as attemptsRepo from "../repositories/attempts.repository.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import { attachDiagramUrls } from "./question-assets.service.js";

export async function startAttempt({
  mockTestId,
  workspaceId,
  userId,
  topic,
  metadata,
}) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  // Trim/normalize to null so "", "  ", and absent all mean the same
  // thing ("no topic filter, whole mock test") everywhere downstream -
  // insertAttempt's conflict target, findActiveAttemptForUser's lookup,
  // and listQuestionsForScoring at submit time all rely on that.
  const normalizedTopic = topic && topic.trim() ? topic.trim() : null;

  const questions = await mockTestsRepo.listPlayableQuestions(
    mockTestId,
    normalizedTopic,
  );
  if (questions.length === 0) {
    throw httpError(
      400,
      normalizedTopic
        ? `No questions found for topic "${normalizedTopic}"`
        : "This mock test has no questions yet",
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Reuse an existing in_progress attempt if one exists for this user,
    // mock test, AND topic - but only for logged-in users, who have a
    // stable user_id to scope the lookup to. Anonymous guest attempts
    // (userId null) have no such identity: "in_progress AND user_id IS
    // NULL" would match ANY guest's in-progress attempt on this mock
    // test, so two different people opening the same shared link could
    // end up merged onto the same attempt. Guests always start a
    // brand-new attempt instead.
    //
    // Scoping by topic too (not just user/mock test) matters as soon as
    // topic-wise practice exists: without it, a student with an
    // in-progress full-test attempt who then clicks into Topic-wise
    // Practice for one topic would silently resume the full-test attempt
    // instead - right question set shown as wrong, or vice versa.
    let attempt = userId
      ? await attemptsRepo.findActiveAttemptForUser(client, {
          mockTestId,
          workspaceId,
          userId,
          topic: normalizedTopic,
        })
      : null;

    if (!attempt) {
      attempt = await attemptsRepo.insertAttempt(client, {
        workspaceId,
        mockTestId,
        userId: userId || null,
        topic: normalizedTopic,
        totalQuestions: questions.length,
        metadata: metadata || {},
      });
    }

    // A concurrent request for the same user/mock test/topic can win the
    // race between our SELECT above and this INSERT (see migration 011,
    // 016, and insertAttempt's ON CONFLICT) - when that happens we get
    // null back instead of a duplicate row, so fetch the attempt the
    // other request created rather than erroring out.
    if (!attempt && userId) {
      attempt = await attemptsRepo.findActiveAttemptForUser(client, {
        mockTestId,
        workspaceId,
        userId,
        topic: normalizedTopic,
      });
    }

    if (!attempt) {
      throw httpError(409, "Could not start this test session - please retry");
    }

    await client.query("COMMIT");

    const clientQuestions = await attachDiagramUrls(
      questions.map((question) => ({
        questionId: question.questionId,
        questionNo: question.questionNo,
        topic: question.topic,
        text: question.text,
        options: question.options,
        questionType: question.questionType,
        hasCode: question.hasCode,
        codeLanguage: question.codeLanguage,
        codeSnippet: question.codeSnippet,
      })),
      workspaceId,
      { shareToken: metadata?.shareToken },
    );

    return {
      attempt: serializeAttempt(attempt),
      mockTest: {
        id: mockTest.id,
        name: mockTest.name,
        description: mockTest.description,
        durationMinutes: mockTest.duration_minutes,
        marksPerCorrect: Number(mockTest.marks_per_correct),
        negativeMarking: Number(mockTest.negative_marks_per_wrong),
        totalQuestions: mockTest.total_questions,
      },
      // Deliberately no correct-answer data here. This is the question set
      // shown to the student WHILE taking the test. Answers are graded
      // server-side at submit time (see submitAttempt below) - the client
      // never sees the answer key until the attempt is 'submitted' (see
      // getAttempt), and its own submitted score is never trusted either.
      questions: clientQuestions,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveAnswer({
  attemptId,
  workspaceId,
  questionId,
  selectedOptionIndexes,
}) {
  if (!Array.isArray(selectedOptionIndexes)) {
    throw httpError(400, "selectedOptionIndexes must be an array");
  }
  if (
    !selectedOptionIndexes.every(
      (value) => Number.isInteger(value) && value >= 0,
    )
  ) {
    throw httpError(
      400,
      "selectedOptionIndexes must contain non-negative integers",
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const attempt = await attemptsRepo.findAttemptForUpdate(
      client,
      attemptId,
      workspaceId,
    );
    if (!attempt) {
      throw httpError(404, "Attempt not found");
    }
    if (attempt.status !== "in_progress") {
      throw httpError(
        409,
        `Cannot answer a question on an attempt that is already ${attempt.status}`,
      );
    }

    // Without this check a client could pass any questionId (e.g. one
    // belonging to a totally different mock test) and it would still
    // satisfy the exam_answers foreign key, just silently record data
    // against the wrong test.
    const questionMockTestId =
      await attemptsRepo.findQuestionMockTestId(questionId);
    if (!questionMockTestId || questionMockTestId !== attempt.mock_test_id) {
      throw httpError(
        400,
        "This question does not belong to this attempt's mock test",
      );
    }

    const answer = await attemptsRepo.upsertAnswer(client, {
      attemptId,
      questionId,
      selectedOptionIndexes,
    });

    await client.query("COMMIT");

    return {
      questionId: answer.question_id,
      selectedOptionIndexes: answer.selected_option_indexes,
      answeredAt: answer.answered_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function submitAttempt({ attemptId, workspaceId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const attempt = await attemptsRepo.findAttemptForUpdate(
      client,
      attemptId,
      workspaceId,
    );
    if (!attempt) {
      throw httpError(404, "Attempt not found");
    }

    if (attempt.status !== "in_progress") {
      // A flaky retry or a double-click submit should be a harmless no-op
      // once the first submission already went through, not a scary error.
      await client.query("COMMIT");
      return serializeAttempt(attempt);
    }

    const mockTest = await mockTestsRepo.findMockTestById(
      attempt.mock_test_id,
      workspaceId,
    );
    const rows = await attemptsRepo.listQuestionsForScoring(
      attempt.mock_test_id,
      attemptId,
      attempt.topic,
    );

    let attemptedCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let score = 0;

    for (const row of rows) {
      const selected = row.selected_option_indexes || [];
      if (selected.length === 0) {
        continue; // stays unattempted - no exam_answers row exists to score
      }

      attemptedCount += 1;

      const correct = row.correct_option_indexes || [];
      const isCorrect = sameNumbersRegardlessOfOrder(selected, correct);

      const marksPerCorrect =
        row.question_marks_per_correct ?? mockTest.marks_per_correct;
      const negativeMarksPerWrong =
        row.question_negative_marks_per_wrong ??
        mockTest.negative_marks_per_wrong;
      const marksAwarded = isCorrect
        ? Number(marksPerCorrect)
        : -Number(negativeMarksPerWrong);

      if (isCorrect) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
      score += marksAwarded;

      await attemptsRepo.updateAnswerScore(client, {
        attemptId,
        questionId: row.question_id,
        isCorrect,
        marksAwarded,
      });
    }

    const unattemptedCount = rows.length - attemptedCount;

    const finalized = await attemptsRepo.finalizeAttempt(client, {
      attemptId,
      status: "submitted",
      attemptedCount,
      correctCount,
      wrongCount,
      unattemptedCount,
      // Round once at the end rather than per-question, so repeated
      // floating point rounding across many questions can't drift the
      // total away from what summing the exact marks would give.
      score: Math.round(score * 100) / 100,
    });

    await client.query("COMMIT");
    return serializeAttempt(finalized);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Two distinct scoping modes share this function:
//   - userId set: a logged-in member looking at their OWN attempt (My
//     Results, or right after submitting their own test) - ownership
//     scoped, since a claimed attempt may not even belong to a workspace
//     this user is a member of. See findAttemptByIdForUser.
//   - userId absent: a guest viewing their shared-link attempt via
//     shared.service.js#getSharedAttempt, which has no user identity at
//     all - workspace(+shareToken)-scoped instead, as before.
// Either way, attachDiagramUrls below uses attempt.workspace_id straight
// off the row we actually found, not the caller's workspaceId argument -
// that's what's real regardless of which path found it.
export async function getAttempt({
  attemptId,
  workspaceId,
  userId,
  shareToken,
}) {
  const attempt = userId
    ? await attemptsRepo.findAttemptByIdForUser(attemptId, userId)
    : await attemptsRepo.findAttemptById(attemptId, workspaceId);
  if (!attempt) {
    throw httpError(404, "Attempt not found");
  }

  const rows = await attemptsRepo.listQuestionsWithAnswersForAttempt(
    attemptId,
    attempt.mock_test_id,
    attempt.topic,
  );

  const isSubmitted = attempt.status === "submitted";

  const questions = await attachDiagramUrls(
    rows.map((row) => ({
      questionId: row.question_id,
      questionNo: row.question_no,
      topic: row.topic,
      text: row.question_text,
      questionType: row.question_type,
      options: row.options,
      // Unlike correctOptionIndexes/explanation/isCorrect/marksAwarded
      // below, these two are never gated on isSubmitted - they describe
      // how to DISPLAY the question body, not the answer key, so there's
      // nothing to leak by including them while an attempt is still in
      // progress.
      hasCode: row.has_code,
      codeLanguage: row.code_language,
      codeSnippet: row.code_snippet,
      selectedOptionIndexes: row.selected_option_indexes || [],
      // Correct answers, explanations, and per-question correctness are
      // ONLY included once the attempt is submitted - resuming an
      // in-progress attempt (e.g. after a page refresh) must never leak
      // the answer key, same reasoning as startAttempt above.
      ...(isSubmitted
        ? {
            correctOptionIndexes: row.correct_option_indexes,
            explanation: row.explanation,
            isCorrect: row.is_correct,
            marksAwarded:
              row.marks_awarded !== null ? Number(row.marks_awarded) : null,
          }
        : {}),
    })),
    attempt.workspace_id,
    { shareToken },
  );

  return {
    attempt: serializeAttemptWithMockTest(attempt),
    questions,
  };
}

// Personal, cross-workspace history - deliberately not scoped to a single
// workspace (see listAttemptsForUser in the repository for why).
export async function listMyAttempts({ userId }) {
  const rows = await attemptsRepo.listAttemptsForUser(userId);
  return rows.map(serializeAttemptWithMockTest);
}

// "Save this result" - links an already-submitted, still-anonymous
// shared-link attempt to a user's account. mockTestId comes from the
// caller (shared.service.js, resolved server-side from the share token) -
// never trust a client-supplied mock test id here. See
// attemptsRepo.claimAttempt for the full set of conditions that must hold
// for the claim to succeed.
export async function claimAttempt({
  attemptId,
  mockTestId,
  shareToken,
  userId,
}) {
  const attempt = await attemptsRepo.claimAttempt({
    attemptId,
    mockTestId,
    shareToken,
    userId,
  });

  if (!attempt) {
    throw httpError(
      404,
      "This result is no longer available to save - it may already be saved, or the link may have expired.",
    );
  }

  return serializeAttempt(attempt);
}

// My Results self-delete only - see attempts.repository.js#deleteAttempt
// for why this is ownership- not workspace-scoped.
export async function deleteAttempt({ attemptId, userId }) {
  const attempt = await attemptsRepo.deleteAttempt(attemptId, userId);
  if (!attempt) {
    throw httpError(404, "Attempt not found");
  }

  return serializeAttempt(attempt);
}

export async function listAttemptsForMockTest({
  mockTestId,
  workspaceId,
  userId,
}) {
  const rows = await attemptsRepo.listAttemptsForMockTest(
    mockTestId,
    workspaceId,
    userId,
  );
  return rows.map(serializeAttempt);
}

/*
 * Owner-facing: every submission on this mock test, member or guest. See
 * attempts.repository.js#listAllAttemptsForMockTest for why this is a
 * separate query rather than listAttemptsForMockTest above with userId
 * made optional - the two have genuinely different access models (one
 * user's own history vs. an owner auditing everyone).
 */
export async function listAllAttemptsForMockTest({ mockTestId, workspaceId }) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const rows = await attemptsRepo.listAllAttemptsForMockTest(
    mockTestId,
    workspaceId,
  );
  return rows.map(serializeSubmission);
}

export async function abandonAttempt({ attemptId, workspaceId }) {
  const attempt = await attemptsRepo.abandonAttempt(attemptId, workspaceId);
  if (!attempt) {
    throw httpError(404, "Attempt not found, or it's already finished");
  }
  return serializeAttempt(attempt);
}

function sameNumbersRegardlessOfOrder(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((value, index) => value === sortedB[index]);
}

export function serializeAttempt(row) {
  return {
    id: row.id,
    mockTestId: row.mock_test_id,
    topic: row.topic,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    totalQuestions: row.total_questions,
    attemptedCount: row.attempted_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    unattemptedCount: row.unattempted_count,
    score: Number(row.score),
  };
}

/*
 * row.user_name comes from listAllAttemptsForMockTest's LEFT JOIN users -
 * only present for a workspace member's own attempt. A guest/shared-link
 * attempt has user_id NULL (so user_name is also NULL) and instead
 * carries its display name in metadata.guestName, set once at attempt
 * creation time (see shared.service.js#startSharedAttempt) - never
 * updatable afterward, which is fine here since this is just a display
 * label, not an identity/auth concern.
 */
/*
 * "Member" here means row.is_member (a real workspace_members row), NOT
 * "row.user_id is set" - claimAttempt lets any logged-in account attach
 * itself to a guest attempt regardless of workspace membership, so
 * user_id alone would mislabel a claimed-but-outside-workspace attempt
 * as a member submission. See attempts.repository.js#listAllAttemptsForMockTest.
 */
function serializeSubmission(row) {
  const metadata = row.metadata || {};
  const isMember = row.is_member === true;
  return {
    ...serializeAttempt(row),
    isGuest: !isMember,
    takerName: isMember
      ? row.user_name
      : metadata.guestName || row.user_name || "Anonymous (shared link)",
    takerEmail: isMember ? row.user_email : null,
  };
}

function serializeAttemptWithMockTest(row) {
  return {
    ...serializeAttempt(row),
    mockTestName: row.mock_test_name,
    durationMinutes: row.duration_minutes,
  };
}
