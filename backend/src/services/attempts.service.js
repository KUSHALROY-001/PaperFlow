import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import * as attemptsRepo from "../repositories/attempts.repository.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import { attachDiagramUrls } from "./question-assets.service.js";

// Shared by startAttempt below and attempts.controller.js#start (which
// hands this whatever shape req.query.topics comes through as - a single
// string for one repeated query param, an array for two or more, or
// undefined for none). Collapses all of that, plus blanks/duplicates, to
// either a sorted array of at least one non-empty topic, or null for "no
// topic filter, the whole mock test" - the one shape every downstream
// repository function (insertAttempt, findActiveAttemptForUser,
// listPlayableQuestions, listQuestionsForScoring,
// listQuestionsWithAnswersForAttempt) expects.
// A topic-scoped practice session pulling e.g. 10 questions out of a
// 90-question/180-minute mock test used to get the FULL 180 minutes on
// its clock - every question's pace was implicitly ~2 minutes, but the
// session length never scaled down with the smaller question set. This
// derives a proportional duration instead: same per-question pace as the
// full test, applied to however many questions this specific session
// actually has.
//
// Only kicks in when the session is a genuine subset (fewer questions
// than the full test has) - a full-test attempt (no topic filter, or a
// topic filter that happens to cover every question) always gets the
// mock test's own configured duration untouched.
const MIN_SESSION_DURATION_MINUTES = 5;

export function computeSessionDurationMinutes({
  fullDurationMinutes,
  totalQuestionsInTest,
  questionsInSession,
}) {
  const fullDuration = Number(fullDurationMinutes) || 0;
  const totalQuestions = Number(totalQuestionsInTest) || 0;

  if (
    !fullDuration ||
    !totalQuestions ||
    questionsInSession >= totalQuestions
  ) {
    return fullDuration;
  }

  const perQuestionMinutes = fullDuration / totalQuestions;
  const scaled = Math.round(perQuestionMinutes * questionsInSession);
  // A tiny topic (say 2 questions out of 90) can scale down to just a
  // minute or two of real clock time - technically proportional, but not
  // a usable session length. Floor it instead of handing someone a timer
  // that expires before they've finished reading the first question.
  return Math.max(scaled, MIN_SESSION_DURATION_MINUTES);
}

export function normalizeTopics(topics) {
  const list = Array.isArray(topics) ? topics : topics ? [topics] : [];
  const cleaned = [
    ...new Set(list.map((t) => (t || "").trim()).filter(Boolean)),
  ].sort();
  return cleaned.length ? cleaned : null;
}

export async function startAttempt({
  mockTestId,
  workspaceId,
  userId,
  topics,
  takerEmail,
  metadata,
}) {
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  // Normalize to a de-duplicated, alphabetically-sorted array, or null for
  // "no topic filter, whole mock test" - undefined, [], and an
  // all-blank/whitespace list all collapse to that same null everywhere
  // downstream (insertAttempt's conflict target, findActiveAttemptForUser's
  // lookup, and listQuestionsForScoring at submit time all rely on it).
  // Sorting matters beyond cosmetics: it's what lets two requests that
  // picked the same topics in a different order still be recognized as
  // the same topic set by the DB-level uniqueness check in insertAttempt.
  const normalizedTopics = normalizeTopics(topics);

  const questions = await mockTestsRepo.listPlayableQuestions(
    mockTestId,
    normalizedTopics,
  );
  if (questions.length === 0) {
    throw httpError(
      400,
      normalizedTopics
        ? `No questions found for topic${normalizedTopics.length > 1 ? "s" : ""} "${normalizedTopics.join(", ")}"`
        : "This mock test has no questions yet",
    );
  }

  // Computed here (not inside insertAttempt) so it's available even on
  // the resume path below, where insertAttempt is never called at all -
  // a resumed attempt that predates migration 019 has no duration_minutes
  // of its own yet, and needs this same fallback value rather than
  // silently reporting 0/undefined.
  const sessionDurationMinutes = computeSessionDurationMinutes({
    fullDurationMinutes: mockTest.duration_minutes,
    totalQuestionsInTest: mockTest.total_questions,
    questionsInSession: questions.length,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Reuse an existing in_progress attempt if one exists for this user,
    // mock test, AND topic set - but only for logged-in users, who have a
    // stable user_id to scope the lookup to. Anonymous guest attempts
    // (userId null) have no such identity: "in_progress AND user_id IS
    // NULL" would match ANY guest's in-progress attempt on this mock
    // test, so two different people opening the same shared link could
    // end up merged onto the same attempt. Guests always start a
    // brand-new attempt instead.
    //
    // Scoping by topic set too (not just user/mock test) matters as soon
    // as topic-wise practice exists: without it, a student with an
    // in-progress full-test attempt who then clicks into Topic-wise
    // Practice for some topics would silently resume the full-test
    // attempt instead - right question set shown as wrong, or vice versa.
    let attempt = userId
      ? await attemptsRepo.findActiveAttemptForUser(client, {
          mockTestId,
          workspaceId,
          userId,
          topics: normalizedTopics,
        })
      : null;

    if (!attempt) {
      attempt = await attemptsRepo.insertAttempt(client, {
        workspaceId,
        mockTestId,
        userId: userId || null,
        topics: normalizedTopics,
        totalQuestions: questions.length,
        durationMinutes: sessionDurationMinutes,
        takerEmail: takerEmail && takerEmail.trim() ? takerEmail.trim() : null,
        metadata: metadata || {},
      });
    }

    // A concurrent request for the same user/mock test/topic set can win
    // the race between our SELECT above and this INSERT (see migration
    // 011, 016, 017, and insertAttempt's ON CONFLICT) - when that happens
    // we get null back instead of a duplicate row, so fetch the attempt
    // the other request created rather than erroring out.
    if (!attempt && userId) {
      attempt = await attemptsRepo.findActiveAttemptForUser(client, {
        mockTestId,
        workspaceId,
        userId,
        topics: normalizedTopics,
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
        // Prefer whatever's actually persisted on the attempt itself -
        // stable across resumes even if the mock test's question count
        // later changes - and only fall back to a fresh computation for
        // an attempt row that predates migration 019 and never had one
        // stored.
        durationMinutes: attempt.duration_minutes ?? sessionDurationMinutes,
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
      attempt.topics,
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
    attempt.topics,
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
    topics: row.topics || [],
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
    // row.duration_minutes is the SESSION's own duration (see migration
    // 019) - proportionally shorter than the full mock test for a
    // topic-scoped practice attempt. Falls back to
    // row.mock_test_duration_minutes (the mock_tests JOIN column, see
    // attempts.repository.js's alias) only for an attempt row that
    // predates that migration and never had its own value stored.
    durationMinutes: row.duration_minutes ?? row.mock_test_duration_minutes,
  };
}
