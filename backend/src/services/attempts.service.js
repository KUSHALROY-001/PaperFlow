import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import * as attemptsRepo from "../repositories/attempts.repository.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import { attachDiagramUrls } from "./question-assets.service.js";

export async function startAttempt({
  mockTestId,
  workspaceId,
  userId,
  metadata,
}) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const questions = await mockTestsRepo.listPlayableQuestions(mockTestId);
  if (questions.length === 0) {
    throw httpError(400, "This mock test has no questions yet");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Reuse existing active in_progress attempt if one exists for this user and mock test
    let attempt = await attemptsRepo.findActiveAttemptForUser(client, {
      mockTestId,
      workspaceId,
      userId: userId || null,
    });

    if (!attempt) {
      attempt = await attemptsRepo.insertAttempt(client, {
        workspaceId,
        mockTestId,
        userId: userId || null,
        totalQuestions: questions.length,
        metadata: metadata || {},
      });
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

export async function getAttempt({ attemptId, workspaceId, shareToken }) {
  const attempt = await attemptsRepo.findAttemptById(attemptId, workspaceId);
  if (!attempt) {
    throw httpError(404, "Attempt not found");
  }

  const rows = await attemptsRepo.listQuestionsWithAnswersForAttempt(
    attemptId,
    attempt.mock_test_id,
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
    workspaceId,
    { shareToken },
  );

  return {
    attempt: serializeAttemptWithMockTest(attempt),
    questions,
  };
}

export async function listMyAttempts({ userId, workspaceId }) {
  const rows = await attemptsRepo.listAttemptsForUser(userId, workspaceId);
  return rows.map(serializeAttemptWithMockTest);
}

export async function deleteAttempt({ attemptId, workspaceId }) {
  const attempt = await attemptsRepo.deleteAttempt(attemptId, workspaceId);
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

function serializeAttempt(row) {
  return {
    id: row.id,
    mockTestId: row.mock_test_id,
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
function serializeSubmission(row) {
  const metadata = row.metadata || {};
  const isGuest = row.user_id === null;
  return {
    ...serializeAttempt(row),
    isGuest,
    takerName: isGuest
      ? metadata.guestName || "Anonymous (shared link)"
      : row.user_name,
  };
}

function serializeAttemptWithMockTest(row) {
  return {
    ...serializeAttempt(row),
    mockTestName: row.mock_test_name,
    durationMinutes: row.duration_minutes,
  };
}
