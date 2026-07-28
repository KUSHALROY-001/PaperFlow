// Extracted from pages/QuestionEditor.jsx — no behavior changes.

export const topics = [
  "Data Structures",
  "Algorithms",
  "Networking",
  "OOP",
  "Computer Architecture",
  "Databases",
  "Java",
  "OS",
  "C Programming",
];

export function toEditorQuestion(question) {
  const options = question.options?.map((option) => option.optionText) || [];

  return {
    id: question.id,
    persisted: true,
    questionNo: question.question_no,
    text: question.question_text,
    options,
    correctOptionIndexes: question.correct_option_indexes || [0],
    topic: question.topic || "Data Structures",
    questionType: question.question_type || "single",
  };
}

// Pure validation — takes no component state, safe to call anywhere.
export function getIssues(q) {
  let issues = 0;
  if (!q.text.trim()) issues++;
  if (q.options.length < 2) issues++;
  if (q.options.some((o) => !o.trim())) issues++;
  if (!q.correctOptionIndexes.length) issues++;
  return issues;
}
