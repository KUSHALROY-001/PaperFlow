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
    // Set by attachDiagramOriginalUrls (mock-tests.service.js#listQuestions
    // only - the exam-play/shared-attempt question shapes never carry
    // these) whenever the asset has an original_storage_path to crop
    // against. Absent (undefined) for a diagram extracted before migration
    // 014 - DiagramCropModal's "Edit Crop" button in QuestionForm.jsx is
    // disabled on exactly that absence, not on hasManualCrop.
    diagramOriginalUrl: question.diagramOriginalUrl,
    hasManualCrop: question.hasManualCrop || false,
    // placement/source: Part C (manual image insert). placement always
    // has a value (attachDiagramUrls sets it whenever ANY asset exists,
    // defaulting "below_text" at the DB column level - see migration
    // 015), but fall back here too in case a question has no asset at all
    // and the key is simply absent. source only ever arrives via
    // attachDiagramOriginalUrls (editor-only), so it's undefined whenever
    // diagramOriginalUrl is - DiagramUploadControl's replace-confirm copy
    // treats that the same as "extracted" (nothing to distinguish yet).
    placement: question.placement || "below_text",
    source: question.source,
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
