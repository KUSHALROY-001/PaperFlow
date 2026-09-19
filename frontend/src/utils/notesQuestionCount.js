// Matches worker/config.py#AI_NOTES_MAX_QUESTIONS and
// mock-tests.service.js#NOTES_QUESTION_COUNT_MAX.
export const NOTES_QUESTION_COUNT_MIN = 1;
export const NOTES_QUESTION_COUNT_MAX = 500;

export function parseDesiredQuestionCount(documentType, rawValue) {
  if (documentType !== "notes") return undefined;
  const trimmed = String(rawValue ?? "").trim();
  if (!trimmed) return undefined;
  const count = Number(trimmed);
  if (
    !Number.isInteger(count) ||
    count < NOTES_QUESTION_COUNT_MIN ||
    count > NOTES_QUESTION_COUNT_MAX
  ) {
    throw new Error(
      `Enter a question count between ${NOTES_QUESTION_COUNT_MIN} and ${NOTES_QUESTION_COUNT_MAX}, or leave it blank.`,
    );
  }
  return count;
}
