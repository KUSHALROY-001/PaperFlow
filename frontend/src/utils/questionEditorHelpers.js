export const topicCategories = [
  "Data Structures",
  "Algorithms",
  "Networking",
  "OOP",
  "Computer Architecture",
  "Databases",
  "Java",
  "OS",
  "C Programming",
  "Discrete Mathematics",
  "Operating Systems",
  "Software Engineering",
  "Digital Logic",
  "Compiler Design",
  "General",
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
    topic: question.topic || "General",
    questionType: question.question_type || "single",
    // The API attaches this (see backend attachDiagramUrls /
    // question-assets.service.js) whenever question_assets has a saved
    // diagram for this question - without carrying it through here it
    // silently never reaches QuestionForm.jsx's `{selected.diagramUrl &&
    // <img .../>}` check, even though the API response has it.
    diagramUrl: question.diagramUrl,
    // Same story as diagramUrl above, for the code-formatting fields -
    // findQuestionById is a plain `SELECT *`, so has_code/code_language
    // are already on the raw row; this is the only place that would
    // otherwise silently drop them before QuestionForm.jsx's preview ever
    // sees them.
    hasCode: question.has_code || false,
    codeLanguage: question.code_language || null,
  };
}

export function getIssues(q) {
  let issues = 0;
  if (!q.text.trim()) issues++;
  if (q.options.length < 2) issues++;
  if (q.options.some((o) => !o.trim())) issues++;
  if (!q.correctOptionIndexes.length) issues++;
  return issues;
}
