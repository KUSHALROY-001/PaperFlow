import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import * as attemptsRepo from "../repositories/attempts.repository.js";
import * as mockTestsRepo from "../repositories/mock-tests.repository.js";
import { attachDiagramUrls } from "./question-assets.service.js";
import { kickWorker } from "../lib/worker-runner.js";

// Fisher-Yates - used once, when a brand-new attempt is created for a
// mock test with settings.questionOrder === "random" (see startAttempt).
// The resulting order is persisted onto the attempt (metadata.questionOrder,
// an array of question ids) rather than re-shuffled on every fetch -
// otherwise a page refresh or resume would show the student a completely
// different question order mid-attempt, and review-after-submit
// (getAttempt) would no longer match what they actually saw while taking
// it. Mutates nothing - returns a new array.
function shuffleQuestions(questions) {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Reorders `questions` (any array of objects carrying `idKey`) to match
// `orderIds` (an array of those same ids, in display order) - used by both
// startAttempt (resuming an attempt) and getAttempt (in-progress or
// post-submit review) so every view of an already-started attempt shows
// questions in the exact order this specific attempt was given them,
// regardless of what the mock test's own settings.questionOrder says NOW
// (that only decides the order for attempts created from this point on -
// see startAttempt). Falls back to `questions` unchanged when there's no
// stored order (sequential attempts never get one - see startAttempt).
// Defensive against drift between the stored id list and the current
// question set (a question deleted/added after the attempt started):
// unknown ids are skipped, and any question missing from orderIds is
// appended at the end in its natural order rather than silently dropped.
function applyStoredQuestionOrder(questions, orderIds, idKey = "questionId") {
  if (!orderIds || !orderIds.length) {
    return questions;
  }

  const byId = new Map(questions.map((question) => [question[idKey], question]));
  const ordered = [];
  for (const id of orderIds) {
    const question = byId.get(id);
    if (question) {
      ordered.push(question);
      byId.delete(id);
    }
  }
  // Anything left in byId wasn't in orderIds at all (added since the
  // attempt started) - keep it, appended in its original relative order.
  for (const question of questions) {
    if (byId.has(question[idKey])) {
      ordered.push(question);
    }
  }
  return ordered;
}

// A question with a per-question override for EITHER field is treated as
// fully opted out of the mock test's own defaults, not half-in/half-out -
// resolving the still-missing field from mockTest's marks would silently
// mix two unrelated scoring schemes on one question (e.g. a JEE Advanced
// numerical question the AI correctly marked +4, wrong-field-missing
// falling back to the mock test's own top-level default, which for a
// paper like that is deliberately 0/0 - i.e. treated as if it had NO
// question-level override at all, when it very much does). The missing
// half of a genuine question-level override defaults to 0 (no marks /
// no penalty) instead - explicit and safe, matching the same "0 means
// no negative marking for this type" convention the extraction pipeline
// itself uses (see provider.py#_apply_section_marks). Only when NEITHER
// field has a question-level value does this fall through to the mock
// test's own paper-wide default.
function resolveQuestionMarks(question, mockTest) {
  const hasMarks = question.marksPerCorrect ?? question.marks_per_correct;
  const hasNegative =
    question.negativeMarksPerWrong ?? question.negative_marks_per_wrong;
  const hasQuestionOverride =
    (hasMarks !== undefined && hasMarks !== null) ||
    (hasNegative !== undefined && hasNegative !== null);

  if (hasQuestionOverride) {
    return {
      marksPerCorrect: hasMarks ?? 0,
      negativeMarksPerWrong: hasNegative ?? 0,
    };
  }

  return {
    marksPerCorrect: mockTest.marks_per_correct,
    negativeMarksPerWrong: mockTest.negative_marks_per_wrong,
  };
}

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
  let list;
  if (Array.isArray(topics)) {
    list = topics;
  } else if (topics) {
    list = [topics];
  } else {
    list = [];
  }
  const cleaned = [
    ...new Set(list.map((t) => (t || "").trim()).filter(Boolean)),
  ].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
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

  // Decided once, up front: applies only to a brand-new attempt (see the
  // insertAttempt call below) - an attempt already in progress keeps
  // whatever order it was created with (applied further down via
  // applyStoredQuestionOrder), even if the mock test's own
  // settings.questionOrder has changed since. "Change it later"
  // (MockTestScoringPanel) is forward-looking, same as changing
  // marksPerCorrect mid-test wouldn't retroactively re-grade an attempt
  // already in progress.
  const orderMode =
    (mockTest.settings || {}).questionOrder === "random"
      ? "random"
      : "sequential";

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
      // Shuffle only decided/applied here, at the moment the attempt is
      // actually created - see the orderMode comment above for why a
      // resumed attempt never re-enters this branch. The chosen order is
      // captured as an id list in metadata.questionOrder so every later
      // fetch of this attempt (resume, or review after submit - see
      // getAttempt) can reconstruct the exact same order via
      // applyStoredQuestionOrder, rather than re-shuffling.
      const questionOrderMetadata =
        orderMode === "random"
          ? { questionOrder: shuffleQuestions(questions).map((q) => q.questionId) }
          : {};

      attempt = await attemptsRepo.insertAttempt(client, {
        workspaceId,
        mockTestId,
        userId: userId || null,
        topics: normalizedTopics,
        totalQuestions: questions.length,
        durationMinutes: sessionDurationMinutes,
        takerEmail: takerEmail && takerEmail.trim() ? takerEmail.trim() : null,
        metadata: { ...(metadata || {}), ...questionOrderMetadata },
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

    const showMarksToStudents = Boolean(
      (mockTest.settings || {}).showMarksToStudents,
    );

    // Whatever order this attempt was actually created with (see
    // orderMode/insertAttempt above) - the same on every resume, not
    // re-derived from the mock test's current settings each time.
    const orderedQuestions = applyStoredQuestionOrder(
      questions,
      attempt.metadata?.questionOrder,
    );

    const clientQuestions = await attachDiagramUrls(
      orderedQuestions.map((question) => ({
        questionId: question.questionId,
        questionNo: question.questionNo,
        topic: question.topic,
        subtopic: question.subtopic,
        passage: question.passage,
        text: question.text,
        options: question.options,
        questionType: question.questionType,
        answerWordLimit: question.answerWordLimit,
        // Only when publisher opts in — default is hidden during attempt.
        ...(showMarksToStudents
          ? resolveQuestionMarks(question, mockTest)
          : {}),
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
        showMarksToStudents,
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
  answerText,
}) {
  const normalizedAnswerText = typeof answerText === "string" ? answerText.trim() : "";
  const normalizedSelectedOptionIndexes = selectedOptionIndexes ?? [];
  if (!Array.isArray(normalizedSelectedOptionIndexes)) {
    throw httpError(400, "selectedOptionIndexes must be an array");
  }
  if (
    !normalizedSelectedOptionIndexes.every(
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
    const question = await attemptsRepo.findQuestionForAttempt(questionId);
    if (!question || question.mock_test_id !== attempt.mock_test_id) {
      throw httpError(
        400,
        "This question does not belong to this attempt's mock test",
      );
    }

    const isMcq = question.question_type === "single" || question.question_type === "multi";
    if (isMcq && normalizedAnswerText) {
      throw httpError(400, "MCQ answers must use selectedOptionIndexes");
    }
    if (!isMcq && normalizedSelectedOptionIndexes.length) {
      throw httpError(400, "This question requires a text or numeric answer");
    }

    const answer = await attemptsRepo.upsertAnswer(client, {
      attemptId,
      questionId,
      selectedOptionIndexes: normalizedSelectedOptionIndexes,
      answerText: isMcq ? null : normalizedAnswerText || null,
    });

    await client.query("COMMIT");

    return {
      questionId: answer.question_id,
      selectedOptionIndexes: answer.selected_option_indexes,
      answerText: answer.answer_text,
      answeredAt: answer.answered_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function normalizeComparableAnswer(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function isFillBlankCorrect(answerText, acceptedAnswers) {
  let submitted = [answerText];
  try {
    const parsed = JSON.parse(answerText);
    if (Array.isArray(parsed)) submitted = parsed;
  } catch {
    // A single blank is stored as plain text for compatibility with callers.
  }
  if (!Array.isArray(acceptedAnswers) || submitted.length !== acceptedAnswers.length) return false;
  return acceptedAnswers.every((alternatives, index) =>
    Array.isArray(alternatives) && alternatives.some(
      (answer) => normalizeComparableAnswer(answer) === normalizeComparableAnswer(submitted[index]),
    ),
  );
}

function isNumericalCorrect(answerText, numericAnswer, numericTolerance) {
  const submitted = Number(answerText);
  const expected = Number(numericAnswer);
  if (!Number.isFinite(submitted) || !Number.isFinite(expected)) return false;
  return Math.abs(submitted - expected) <= Number(numericTolerance ?? 0);
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

    const pendingGradingQuestionIds = [];
    for (const row of rows) {
      const selected = row.selected_option_indexes || [];
      const answerText = (row.answer_text || "").trim();
      const isMcq = row.question_type === "single" || row.question_type === "multi";
      if ((isMcq && selected.length === 0) || (!isMcq && !answerText)) {
        continue; // stays unattempted - no exam_answers row exists to score
      }

      attemptedCount += 1;

      if (row.question_type === "short_answer" || row.question_type === "long_answer") {
        pendingGradingQuestionIds.push(row.question_id);
        await attemptsRepo.markAnswerPendingGrading(client, {
          attemptId,
          questionId: row.question_id,
        });
        continue;
      }

      const isCorrect = isMcq
        ? sameNumbersRegardlessOfOrder(selected, row.correct_option_indexes || [])
        : row.question_type === "fill_blank"
          ? isFillBlankCorrect(answerText, row.accepted_answers)
          : isNumericalCorrect(answerText, row.numeric_answer, row.numeric_tolerance);

      const { marksPerCorrect, negativeMarksPerWrong } = resolveQuestionMarks(
        {
          marks_per_correct: row.question_marks_per_correct,
          negative_marks_per_wrong: row.question_negative_marks_per_wrong,
        },
        mockTest,
      );
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

    await attemptsRepo.createGradingBatches(client, {
      attemptId,
      questionIds: pendingGradingQuestionIds,
    });

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
    if (pendingGradingQuestionIds.length) {
      kickWorker({ jobId: `grading:${attemptId}` });
    }
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

  // Same stored per-attempt order startAttempt applies - this is what
  // makes a page refresh mid-attempt, and the post-submit review, show
  // questions in the same order the student actually saw them while
  // taking it, even for a "random" mock test. Rows here key on
  // question_id (snake_case), unlike startAttempt's questionId.
  const orderedRows = applyStoredQuestionOrder(
    rows,
    attempt.metadata?.questionOrder,
    "question_id",
  );

  const isSubmitted = attempt.status === "submitted";

  const questions = await attachDiagramUrls(
    orderedRows.map((row) => ({
      questionId: row.question_id,
      questionNo: row.question_no,
      topic: row.topic,
      text: row.question_text,
      questionType: row.question_type,
      options: row.options,
      answerWordLimit: row.answer_word_limit,
      // Unlike correctOptionIndexes/explanation/isCorrect/marksAwarded
      // below, these are never gated on isSubmitted - they describe
      // how to DISPLAY the question body, not the answer key, so there's
      // nothing to leak by including them while an attempt is still in
      // progress.
      subtopic: row.subtopic,
      passage: row.passage,
      selectedOptionIndexes: row.selected_option_indexes || [],
      answerText: row.answer_text || "",
      gradingStatus: row.grading_status || "not_applicable",
      marksPerCorrect:
        row.question_marks_per_correct !== null &&
        row.question_marks_per_correct !== undefined
          ? Number(row.question_marks_per_correct)
          : null,
      negativeMarksPerWrong:
        row.question_negative_marks_per_wrong !== null &&
        row.question_negative_marks_per_wrong !== undefined
          ? Number(row.question_negative_marks_per_wrong)
          : null,
      // Correct answers, explanations, and per-question correctness are
      // ONLY included once the attempt is submitted - resuming an
      // in-progress attempt (e.g. after a page refresh) must never leak
      // the answer key, same reasoning as startAttempt above.
      ...(isSubmitted
        ? {
            correctOptionIndexes: row.correct_option_indexes,
            acceptedAnswers: row.accepted_answers,
            gradingRubric: row.grading_rubric,
            expectedAnswer: row.expected_answer,
            numericAnswer: row.numeric_answer !== null ? Number(row.numeric_answer) : null,
            numericTolerance: row.numeric_tolerance !== null ? Number(row.numeric_tolerance) : null,
            explanation: row.explanation,
            isCorrect: row.is_correct,
            marksAwarded:
              row.marks_awarded !== null ? Number(row.marks_awarded) : null,
            aiSuggestedMarks:
              row.ai_suggested_marks !== null ? Number(row.ai_suggested_marks) : null,
            aiRubricBreakdown: row.ai_rubric_breakdown,
            aiReasoning: row.ai_reasoning,
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
  // listAllAttemptsForMockTest just below already guards with this same
  // check - this sibling function (a user's own attempts, vs. the owner-
  // facing "everyone's attempts" version) was the one instance that got
  // missed, same bug class TestSprite's suite caught on
  // clusters.service.js#listMockTestsForCluster: a bad mockTestId matches
  // zero rows in the underlying query and silently returns an empty list
  // instead of 404.
  const mockTest = await mockTestsRepo.findMockTestById(
    mockTestId,
    workspaceId,
  );
  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

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
    // Sum of each question's max marks on this attempt's paper (topic-scoped
    // for practice). Used for % = score / maxMarks — NOT totalQuestions.
    maxMarks:
      row.max_marks !== null && row.max_marks !== undefined
        ? Number(row.max_marks)
        : null,
    marksPerCorrect:
      row.mock_test_marks_per_correct !== null &&
      row.mock_test_marks_per_correct !== undefined
        ? Number(row.mock_test_marks_per_correct)
        : null,
    negativeMarksPerWrong:
      row.mock_test_negative_marks_per_wrong !== null &&
      row.mock_test_negative_marks_per_wrong !== undefined
        ? Number(row.mock_test_negative_marks_per_wrong)
        : null,
    // row.duration_minutes is the SESSION's own duration (see migration
    // 019) - proportionally shorter than the full mock test for a
    // topic-scoped practice attempt. Falls back to
    // row.mock_test_duration_minutes (the mock_tests JOIN column, see
    // attempts.repository.js's alias) only for an attempt row that
    // predates that migration and never had its own value stored.
    durationMinutes: row.duration_minutes ?? row.mock_test_duration_minutes,
  };
}
