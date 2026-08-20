import { pool } from "../db/pool.js";
import { httpError } from "../lib/http-error.js";
import {
  optionalNumber,
  optionalString,
  requiredArray,
  requiredString,
} from "../lib/validators.js";
import * as questionsRepo from "../repositories/questions.repository.js";

function validateAnswerShape({
  questionType,
  correctOptionIndexes,
  optionCount,
}) {
  if (
    correctOptionIndexes.some(
      (index) => !Number.isInteger(index) || index < 0 || index >= optionCount,
    )
  ) {
    throw httpError(
      400,
      "correctOptionIndexes contains an invalid option index",
    );
  }

  if (questionType === "single" && correctOptionIndexes.length !== 1) {
    throw httpError(
      400,
      "single questions must have exactly one correct option",
    );
  }
}

export async function createQuestion(workspaceId, body) {
  const mockTestId = requiredString(body.mockTestId, "mockTestId");
  const questionNo = Number(body.questionNo);
  const questionText = requiredString(body.questionText, "questionText");
  const rawOptions = requiredArray(body.options, "options");
  const options = rawOptions.map((option, index) =>
    requiredString(option, `options[${index}]`),
  );
  const correctOptionIndexes = requiredArray(
    body.correctOptionIndexes,
    "correctOptionIndexes",
  ).map(Number);
  const questionType = body.questionType === "multi" ? "multi" : "single";

  if (!Number.isInteger(questionNo) || questionNo <= 0) {
    throw httpError(400, "questionNo must be a positive integer");
  }

  validateAnswerShape({
    questionType,
    correctOptionIndexes,
    optionCount: options.length,
  });

  const mockTest = await questionsRepo.findMockTestForWorkspace(
    mockTestId,
    workspaceId,
  );

  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const question = await questionsRepo.createQuestion(client, {
      workspaceId,
      mockTestId,
      questionNo,
      topic: optionalString(body.topic),
      subtopic: optionalString(body.subtopic),
      passage: optionalString(body.passage),
      questionText,
      explanation: optionalString(body.explanation),
      questionType,
      correctOptionIndexes,
      options,
      marksPerCorrect: optionalNumber(body.marksPerCorrect, null),
      negativeMarksPerWrong: optionalNumber(body.negativeMarksPerWrong, null),
      sourcePage: optionalNumber(body.sourcePage, null),
      confidence: optionalNumber(body.confidence, null),
      status: body.status || "needs_review",
      metadata: body.metadata || {},
    });

    await client.query("COMMIT");
    return question;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getQuestion(questionId, workspaceId) {
  const question = await questionsRepo.findQuestionById(
    questionId,
    workspaceId,
  );

  if (!question) {
    throw httpError(404, "Question not found");
  }

  return question;
}

// Fork-on-edit (migration 028): a question's content_id can be shared
// with slots in OTHER mock tests (via duplicates.service.js's merge
// action, or question-bank.service.js's copy action). Editing shared
// content in place would silently change what every OTHER mock test
// sharing it shows its own students - possibly one that's already
// published and live. So: if this slot's content_id currently has more
// than one slot pointing at it AND the edit actually touches a content
// field (questions.repository.js's CONTENT_FIELDS list, or options),
// clone the content row first and repoint ONLY this slot at the clone
// before writing anything - the edit lands on a now-exclusive copy, and
// every other mock test sharing the original keeps seeing it unchanged.
// A slot-only edit (status/questionNo/sourcePage/confidence) - or an
// edit to already-exclusive content - never forks; it's a plain update,
// which for exclusive content is exactly as cheap as it always was.
export async function updateQuestion(questionId, workspaceId, body) {
  const existing = await questionsRepo.findQuestionById(
    questionId,
    workspaceId,
  );

  if (!existing) {
    throw httpError(404, "Question not found");
  }

  const options =
    body.options === undefined
      ? undefined
      : requiredArray(body.options, "options").map((option, index) =>
          requiredString(option, `options[${index}]`),
        );
  const correctOptionIndexes = body.correctOptionIndexes?.map(Number);
  const questionType =
    body.questionType === undefined
      ? undefined
      : body.questionType === "multi"
        ? "multi"
        : "single";

  if (correctOptionIndexes && correctOptionIndexes.length === 0) {
    throw httpError(400, "correctOptionIndexes must not be empty");
  }

  const effectiveQuestionType = questionType || existing.question_type;
  const effectiveCorrectOptionIndexes =
    correctOptionIndexes || existing.correct_option_indexes || [];
  const effectiveOptionCount =
    options?.length ?? (Array.isArray(existing.options) ? existing.options.length : 0);

  if (
    body.questionType !== undefined ||
    correctOptionIndexes ||
    options !== undefined
  ) {
    validateAnswerShape({
      questionType: effectiveQuestionType,
      correctOptionIndexes: effectiveCorrectOptionIndexes,
      optionCount: effectiveOptionCount,
    });
  }

  const contentFieldTouched =
    body.topic !== undefined ||
    body.subtopic !== undefined ||
    body.passage !== undefined ||
    body.questionText !== undefined ||
    body.explanation !== undefined ||
    body.questionType !== undefined ||
    body.correctOptionIndexes !== undefined ||
    body.marksPerCorrect !== undefined ||
    body.negativeMarksPerWrong !== undefined ||
    body.metadata !== undefined ||
    options !== undefined;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let targetContentId = existing.content_id;

    if (contentFieldTouched) {
      const sharedCount = await questionsRepo.countSlotsForContent(
        client,
        existing.content_id,
      );
      if (sharedCount > 1) {
        // Shared - fork. Clone the content row so the edit lands on an
        // exclusive copy, never the shared original.
        targetContentId = await questionsRepo.cloneContent(
          client,
          existing.content_id,
        );
      }
    }

    if (contentFieldTouched) {
      await questionsRepo.updateContent(client, targetContentId, {
        topicProvided: body.topic !== undefined,
        topic: optionalString(body.topic),
        subtopicProvided: body.subtopic !== undefined,
        subtopic: optionalString(body.subtopic),
        passageProvided: body.passage !== undefined,
        passage: optionalString(body.passage),
        questionText:
          body.questionText === undefined
            ? null
            : requiredString(body.questionText, "questionText"),
        explanationProvided: body.explanation !== undefined,
        explanation: optionalString(body.explanation),
        questionType: questionType || null,
        correctOptionIndexes: correctOptionIndexes || null,
        options,
        marksPerCorrectProvided: body.marksPerCorrect !== undefined,
        marksPerCorrect: optionalNumber(body.marksPerCorrect, null),
        negativeMarksPerWrongProvided: body.negativeMarksPerWrong !== undefined,
        negativeMarksPerWrong: optionalNumber(body.negativeMarksPerWrong, null),
        metadata: body.metadata || null,
      });
    }

    const updated = await questionsRepo.updateSlot(
      client,
      existing.id,
      workspaceId,
      {
        questionNo: optionalNumber(body.questionNo, null),
        sourcePageProvided: body.sourcePage !== undefined,
        sourcePage: optionalNumber(body.sourcePage, null),
        confidenceProvided: body.confidence !== undefined,
        confidence: optionalNumber(body.confidence, null),
        status: body.status || null,
        // Only actually changes anything when a fork just happened above
        // (targetContentId !== existing.content_id) - updateSlot's own
        // COALESCE leaves content_id untouched otherwise.
        contentIdOverride:
          targetContentId !== existing.content_id ? targetContentId : null,
      },
    );

    if (!updated) {
      throw httpError(404, "Question not found");
    }

    await client.query("COMMIT");

    // Re-read the full row through the same view every other read in
    // this file uses, rather than hand-merging the slot/content update
    // results - one source of truth for "what a question row looks
    // like" (same reasoning as createQuestion's repository counterpart).
    const finalResult = await pool.query(
      "SELECT * FROM questions WHERE id = $1",
      [existing.id],
    );
    return finalResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteQuestion(questionId, workspaceId) {
  const deleted = await questionsRepo.deleteQuestion(questionId, workspaceId);

  if (!deleted) {
    throw httpError(404, "Question not found");
  }
}

const BULK_STATUS_LIMIT = 100;

export async function bulkUpdateStatus(workspaceId, body) {
  const questionIds = requiredArray(body.questionIds, "questionIds");
  const status = body.status;

  if (!["approved", "rejected"].includes(status)) {
    throw httpError(
      400,
      "status must be 'approved' or 'rejected' for bulk updates",
    );
  }
  if (questionIds.length > BULK_STATUS_LIMIT) {
    throw httpError(
      400,
      `Cannot update more than ${BULK_STATUS_LIMIT} questions at once`,
    );
  }

  const updatedIds = await questionsRepo.bulkUpdateStatus(
    questionIds,
    workspaceId,
    status,
  );

  return { updatedIds };
}

export async function reorderQuestions(mockTestId, workspaceId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, "items array is required");
  }

  const mockTest = await questionsRepo.findMockTestForWorkspace(
    mockTestId,
    workspaceId,
  );

  if (!mockTest) {
    throw httpError(404, "Mock test not found");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // question_no lives on question_slots (migration 028) - questions is
    // a read-only view now, so these writes target the physical table
    // directly.
    // Pass 1: Set question_no to 10000 + offset to satisfy check constraint (>0) while clearing slots
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      await client.query(
        "UPDATE question_slots SET question_no = $1 WHERE id = $2 AND mock_test_id = $3 AND workspace_id = $4",
        [10000 + index + 1, item.id, mockTestId, workspaceId],
      );
    }

    // Pass 2: Set question_no to final position numbers
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const finalNo = Number(item.questionNo || index + 1);
      await client.query(
        "UPDATE question_slots SET question_no = $1 WHERE id = $2 AND mock_test_id = $3 AND workspace_id = $4",
        [finalNo, item.id, mockTestId, workspaceId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
