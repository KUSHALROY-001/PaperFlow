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
  const questsionNo = Number(body.questionNo);
  const questionText = requiredString(body.questionText, "questionText");
  const rawOptions = requiredArray(body.options, "options");
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
    optionCount: rawOptions.length,
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
      marksPerCorrect: optionalNumber(body.marksPerCorrect, null),
      negativeMarksPerWrong: optionalNumber(body.negativeMarksPerWrong, null),
      sourcePage: optionalNumber(body.sourcePage, null),
      confidence: optionalNumber(body.confidence, null),
      status: body.status || "needs_review",
      metadata: body.metadata || {},
    });

    for (let index = 0; index < rawOptions.length; index += 1) {
      const optionText = requiredString(rawOptions[index], `options[${index}]`);
      await questionsRepo.insertQuestionOption(client, {
        questionId: question.id,
        optionIndex: index,
        optionText,
      });
    }

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

  const options = await questionsRepo.listOptionsForQuestion(question.id);

  return { ...question, options };
}

export async function updateQuestion(questionId, workspaceId, body) {
  const existing = await questionsRepo.findQuestionById(
    questionId,
    workspaceId,
  );

  if (!existing) {
    throw httpError(404, "Question not found");
  }

  const rawOptions = body.options;
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

  if (
    questionType === "single" &&
    correctOptionIndexes &&
    correctOptionIndexes.length !== 1
  ) {
    throw httpError(
      400,
      "single questions must have exactly one correct option",
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updated = await questionsRepo.updateQuestion(
      client,
      existing.id,
      workspaceId,
      {
        questionNo: optionalNumber(body.questionNo, null),
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
        marksPerCorrectProvided: body.marksPerCorrect !== undefined,
        marksPerCorrect: optionalNumber(body.marksPerCorrect, null),
        negativeMarksPerWrongProvided: body.negativeMarksPerWrong !== undefined,
        negativeMarksPerWrong: optionalNumber(body.negativeMarksPerWrong, null),
        sourcePageProvided: body.sourcePage !== undefined,
        sourcePage: optionalNumber(body.sourcePage, null),
        confidenceProvided: body.confidence !== undefined,
        confidence: optionalNumber(body.confidence, null),
        status: body.status || null,
        metadata: body.metadata || null,
      },
    );

    if (Array.isArray(rawOptions)) {
      await questionsRepo.deleteOptionsForQuestion(client, existing.id);

      for (let index = 0; index < rawOptions.length; index += 1) {
        const optionText = requiredString(
          rawOptions[index],
          `options[${index}]`,
        );
        await questionsRepo.insertQuestionOption(client, {
          questionId: existing.id,
          optionIndex: index,
          optionText,
        });
      }
    }

    await client.query("COMMIT");
    return updated;
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

    // Pass 1: Set question_no to 10000 + offset to satisfy check constraint (>0) while clearing slots
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      await client.query(
        "UPDATE questions SET question_no = $1 WHERE id = $2 AND mock_test_id = $3 AND workspace_id = $4",
        [10000 + index + 1, item.id, mockTestId, workspaceId],
      );
    }

    // Pass 2: Set question_no to final position numbers
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const finalNo = Number(item.questionNo || index + 1);
      await client.query(
        "UPDATE questions SET question_no = $1 WHERE id = $2 AND mock_test_id = $3 AND workspace_id = $4",
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

