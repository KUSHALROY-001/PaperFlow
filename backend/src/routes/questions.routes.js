import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/async-handler.js';
import { httpError } from '../lib/http-error.js';
import { optionalNumber, optionalString, requiredArray, requiredString } from '../lib/validators.js';

export const questionsRouter = Router();

async function assertQuestionAccess(questionId, workspaceId) {
  const result = await pool.query(
    `
    SELECT *
    FROM questions
    WHERE id = $1
      AND workspace_id = $2
    `,
    [questionId, workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Question not found');
  }

  return result.rows[0];
}

async function assertMockTestAccess(mockTestId, workspaceId) {
  const result = await pool.query(
    'SELECT id FROM mock_tests WHERE id = $1 AND workspace_id = $2',
    [mockTestId, workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Mock test not found');
  }
}

questionsRouter.post('/', asyncHandler(async (req, res) => {
  const mockTestId = requiredString(req.body.mockTestId, 'mockTestId');
  const questionNo = Number(req.body.questionNo);
  const questionText = requiredString(req.body.questionText, 'questionText');
  const rawOptions = requiredArray(req.body.options, 'options');
  const correctOptionIndexes = requiredArray(req.body.correctOptionIndexes, 'correctOptionIndexes').map(Number);
  const questionType = req.body.questionType === 'multi' ? 'multi' : 'single';

  if (!Number.isInteger(questionNo) || questionNo <= 0) {
    throw httpError(400, 'questionNo must be a positive integer');
  }

  if (correctOptionIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= rawOptions.length)) {
    throw httpError(400, 'correctOptionIndexes contains an invalid option index');
  }

  if (questionType === 'single' && correctOptionIndexes.length !== 1) {
    throw httpError(400, 'single questions must have exactly one correct option');
  }

  await assertMockTestAccess(mockTestId, req.workspaceId);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const questionResult = await client.query(
      `
      INSERT INTO questions (
        workspace_id,
        mock_test_id,
        question_no,
        topic,
        subtopic,
        passage,
        question_text,
        explanation,
        question_type,
        correct_option_indexes,
        marks_per_correct,
        negative_marks_per_wrong,
        source_page,
        confidence,
        status,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::int[], $11, $12, $13, $14, $15, $16)
      RETURNING *
      `,
      [
        req.workspaceId,
        mockTestId,
        questionNo,
        optionalString(req.body.topic),
        optionalString(req.body.subtopic),
        optionalString(req.body.passage),
        questionText,
        optionalString(req.body.explanation),
        questionType,
        correctOptionIndexes,
        optionalNumber(req.body.marksPerCorrect, null),
        optionalNumber(req.body.negativeMarksPerWrong, null),
        optionalNumber(req.body.sourcePage, null),
        optionalNumber(req.body.confidence, null),
        req.body.status || 'needs_review',
        req.body.metadata || {},
      ],
    );

    const question = questionResult.rows[0];

    for (let index = 0; index < rawOptions.length; index += 1) {
      const optionText = requiredString(rawOptions[index], `options[${index}]`);
      await client.query(
        `
        INSERT INTO question_options (question_id, option_index, option_text)
        VALUES ($1, $2, $3)
        `,
        [question.id, index, optionText],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ question });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

questionsRouter.get('/:questionId', asyncHandler(async (req, res) => {
  const question = await assertQuestionAccess(req.params.questionId, req.workspaceId);
  const optionsResult = await pool.query(
    `
    SELECT id, option_index AS "optionIndex", option_text AS "optionText"
    FROM question_options
    WHERE question_id = $1
    ORDER BY option_index ASC
    `,
    [question.id],
  );

  res.json({ question: { ...question, options: optionsResult.rows } });
}));

questionsRouter.patch('/:questionId', asyncHandler(async (req, res) => {
  const existing = await assertQuestionAccess(req.params.questionId, req.workspaceId);
  const rawOptions = req.body.options;
  const correctOptionIndexes = req.body.correctOptionIndexes?.map(Number);
  const questionType = req.body.questionType === undefined
    ? undefined
    : req.body.questionType === 'multi' ? 'multi' : 'single';

  if (correctOptionIndexes && correctOptionIndexes.length === 0) {
    throw httpError(400, 'correctOptionIndexes must not be empty');
  }

  if (questionType === 'single' && correctOptionIndexes && correctOptionIndexes.length !== 1) {
    throw httpError(400, 'single questions must have exactly one correct option');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      `
      UPDATE questions
      SET
        question_no = COALESCE($3, question_no),
        topic = CASE WHEN $4::boolean THEN $5 ELSE topic END,
        subtopic = CASE WHEN $6::boolean THEN $7 ELSE subtopic END,
        passage = CASE WHEN $8::boolean THEN $9 ELSE passage END,
        question_text = COALESCE($10, question_text),
        explanation = CASE WHEN $11::boolean THEN $12 ELSE explanation END,
        question_type = COALESCE($13::question_type, question_type),
        correct_option_indexes = COALESCE($14::int[], correct_option_indexes),
        marks_per_correct = CASE WHEN $15::boolean THEN $16 ELSE marks_per_correct END,
        negative_marks_per_wrong = CASE WHEN $17::boolean THEN $18 ELSE negative_marks_per_wrong END,
        source_page = CASE WHEN $19::boolean THEN $20 ELSE source_page END,
        confidence = CASE WHEN $21::boolean THEN $22 ELSE confidence END,
        status = COALESCE($23::question_status, status),
        metadata = COALESCE($24, metadata)
      WHERE id = $1
        AND workspace_id = $2
      RETURNING *
      `,
      [
        existing.id,
        req.workspaceId,
        optionalNumber(req.body.questionNo, null),
        req.body.topic !== undefined,
        optionalString(req.body.topic),
        req.body.subtopic !== undefined,
        optionalString(req.body.subtopic),
        req.body.passage !== undefined,
        optionalString(req.body.passage),
        req.body.questionText === undefined ? null : requiredString(req.body.questionText, 'questionText'),
        req.body.explanation !== undefined,
        optionalString(req.body.explanation),
        questionType || null,
        correctOptionIndexes || null,
        req.body.marksPerCorrect !== undefined,
        optionalNumber(req.body.marksPerCorrect, null),
        req.body.negativeMarksPerWrong !== undefined,
        optionalNumber(req.body.negativeMarksPerWrong, null),
        req.body.sourcePage !== undefined,
        optionalNumber(req.body.sourcePage, null),
        req.body.confidence !== undefined,
        optionalNumber(req.body.confidence, null),
        req.body.status || null,
        req.body.metadata || null,
      ],
    );

    if (Array.isArray(rawOptions)) {
      await client.query('DELETE FROM question_options WHERE question_id = $1', [existing.id]);

      for (let index = 0; index < rawOptions.length; index += 1) {
        const optionText = requiredString(rawOptions[index], `options[${index}]`);
        await client.query(
          `
          INSERT INTO question_options (question_id, option_index, option_text)
          VALUES ($1, $2, $3)
          `,
          [existing.id, index, optionText],
        );
      }
    }

    await client.query('COMMIT');
    res.json({ question: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

questionsRouter.delete('/:questionId', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `
    DELETE FROM questions
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [req.params.questionId, req.workspaceId],
  );

  if (result.rowCount === 0) {
    throw httpError(404, 'Question not found');
  }

  res.status(204).send();
}));
