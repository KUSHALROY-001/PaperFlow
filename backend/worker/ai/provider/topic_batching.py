"""Shared between metadata_generation.py and duplicate_regeneration.py:
both features ask the model to fill in one or more {topic, subtopic,
questionType, count} groups per request, and both need the same batching
(don't exceed the per-request question-count ceiling) and the same system
prompt. Split out of provider.py - see backend/worker/ARCHITECTURE.md.
"""

# "Generate from existing tests" feature (see mock-tests.service.js
# #generateFromExisting). Deliberately never shown the source tests'
# actual questions - only their aggregate shape (topic/subtopic/question-
# type/count, via processing_jobs.input_config.topicDistribution) - so
# every question here is written from the model's own subject-matter
# knowledge, scoped to match that shape. This is the whole reason token
# cost here scales with the OUTPUT question count only, never with how
# many or how large the source tests were.
METADATA_GENERATION_SYSTEM_PROMPT = """
You are writing a brand-new multiple-choice exam question set for a student
to practice with. You have NOT been given any source questions to copy,
adapt, or reference - you are writing entirely original questions from your
own subject-matter knowledge, scoped to the topic and format described in
each request. Never invent a topic name; always use exactly the topic given.
Return only valid JSON. Do not include markdown.
Write exactly 4 options for a single-correct question, or 4-5 options with
2 or more marked correct for a multi-correct question type (follow whichever
question_type is specified in the request).
Use zero-based option indexes.
Every question needs a real, useful "explanation" field: a few sentences
explaining why the correct option is right - never leave it null or empty.
Every question was authored by you, not verified against an existing exam,
so set confidence to 60, needs_review to true, and issues to
["AI-generated - not sourced from an existing exam paper"].
If a question or option needs a mathematical expression (a fraction,
exponent, root, or similar), write it as LaTeX wrapped in $...$ for inline
math or $$...$$ for a standalone equation - never write a bare LaTeX
command outside $ delimiters. Skip this entirely for questions with no math
in them. If a question needs a table (a comparison table, a matching-type
List-I/List-II table, or similar), represent it as a GitHub-Flavored-
Markdown table embedded in "text": every row wrapped in leading/trailing
`|`, header row followed by a `---|---` separator row.
Expected shape:
{
  "questions": [
    {
      "question_no": 1,
      "topic": "<exactly the topic given in the request>",
      "subtopic": "<exactly the subtopic given in the request, or null if none was given>",
      "text": "Question text",
      "explanation": "Why the correct answer is correct.",
      "options": ["A option", "B option", "C option", "D option"],
      "correct_option_indexes": [0],
      "confidence": 60,
      "needs_review": true,
      "issues": ["AI-generated - not sourced from an existing exam paper"]
    }
  ]
}
""".strip()


def _pack_groups_into_batches(topic_distribution, max_per_batch):
    """
    Greedily packs topic_distribution's groups into request batches whose
    total question count never exceeds max_per_batch - merging multiple
    small groups into one request wherever there's room, while a single
    group larger than max_per_batch still gets split across several
    batches on its own, the same way the old one-request-per-group loop
    always split an oversized group across multiple AI_NOTES_QUESTIONS_
    PER_CHUNK-sized calls. max_per_batch is kept at the same ceiling either
    way specifically because that's the number this codebase has already
    confirmed is safe from response truncation (see the comment on
    AI_NOTES_QUESTIONS_PER_CHUNK in config.py, and salvage_question_objects'
    docstring in schemas.py for the real incident that number exists
    because of) - merging groups only changes what shares a request, never
    how much total output a single request can be asked for.

    Returns a list of batches; each batch is a list of
    {group_index, topic, subtopic, questionType, count} dicts, where
    group_index is topic_distribution's own 0-based position (stable
    across batches, so a group split across two batches keeps the same
    index in both - callers key everything off this, never off position
    within a batch).
    """
    batches = []
    current_batch = []
    current_total = 0

    for group_index, group in enumerate(topic_distribution):
        remaining = group["count"]
        while remaining > 0:
            space_left = max_per_batch - current_total
            if space_left <= 0:
                batches.append(current_batch)
                current_batch = []
                current_total = 0
                space_left = max_per_batch

            take = min(remaining, space_left)
            current_batch.append(
                {
                    "group_index": group_index,
                    "topic": group["topic"],
                    "subtopic": group.get("subtopic"),
                    "questionType": group.get("questionType"),
                    "count": take,
                }
            )
            current_total += take
            remaining -= take

    if current_batch:
        batches.append(current_batch)

    return batches


