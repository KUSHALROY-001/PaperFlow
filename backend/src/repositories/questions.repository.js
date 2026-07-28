import { pool } from "../db/pool.js";

export async function findMockTestForWorkspace(mockTestId, workspaceId) {
  const result = await pool.query(
    "SELECT id FROM mock_tests WHERE id = $1 AND workspace_id = $2",
    [mockTestId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function findQuestionById(questionId, workspaceId) {
  const result = await pool.query(
    "SELECT * FROM questions WHERE id = $1 AND workspace_id = $2",
    [questionId, workspaceId],
  );

  return result.rows[0] || null;
}

export async function listOptionsForQuestion(questionId) {
  const result = await pool.query(
    `
    SELECT id, option_index AS "optionIndex", option_text AS "optionText"
    FROM question_options
    WHERE question_id = $1
    ORDER BY option_index ASC
    `,
    [questionId],
  );

  return result.rows;
}

export async function createQuestion(
  client,
  {
    workspaceId,
    mockTestId,
    questionNo,
    topic,
    subtopic,
    passage,
    questionText,
    explanation,
    questionType,
    correctOptionIndexes,
    marksPerCorrect,
    negativeMarksPerWrong,
    sourcePage,
    confidence,
    status,
    metadata,
  },
) {
  const result = await client.query(
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
      workspaceId,
      mockTestId,
      questionNo,
      topic,
      subtopic,
      passage,
      questionText,
      explanation,
      questionType,
      correctOptionIndexes,
      marksPerCorrect,
      negativeMarksPerWrong,
      sourcePage,
      confidence,
      status,
      metadata,
    ],
  );

  return result.rows[0];
}

export async function insertQuestionOption(
  client,
  { questionId, optionIndex, optionText },
) {
  await client.query(
    "INSERT INTO question_options (question_id, option_index, option_text) VALUES ($1, $2, $3)",
    [questionId, optionIndex, optionText],
  );
}

export async function deleteOptionsForQuestion(client, questionId) {
  await client.query("DELETE FROM question_options WHERE question_id = $1", [
    questionId,
  ]);
}

export async function updateQuestion(client, questionId, workspaceId, fields) {
  const {
    questionNo,
    topicProvided,
    topic,
    subtopicProvided,
    subtopic,
    passageProvided,
    passage,
    questionText,
    explanationProvided,
    explanation,
    questionType,
    correctOptionIndexes,
    marksPerCorrectProvided,
    marksPerCorrect,
    negativeMarksPerWrongProvided,
    negativeMarksPerWrong,
    sourcePageProvided,
    sourcePage,
    confidenceProvided,
    confidence,
    status,
    metadata,
  } = fields;

  const result = await client.query(
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
      questionId,
      workspaceId,
      questionNo,
      topicProvided,
      topic,
      subtopicProvided,
      subtopic,
      passageProvided,
      passage,
      questionText,
      explanationProvided,
      explanation,
      questionType,
      correctOptionIndexes,
      marksPerCorrectProvided,
      marksPerCorrect,
      negativeMarksPerWrongProvided,
      negativeMarksPerWrong,
      sourcePageProvided,
      sourcePage,
      confidenceProvided,
      confidence,
      status,
      metadata,
    ],
  );

  return result.rows[0] || null;
}

export async function deleteQuestion(questionId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM questions WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [questionId, workspaceId],
  );

  return result.rowCount > 0;
}
