from ..asset_extractor import crop_diagram
from ..config import (
    AI_GENERATE_FROM_NOTES,
    AI_MAX_CHARS_PER_CHUNK,
    AI_NOTES_MAX_QUESTIONS,
    AI_NOTES_QUESTIONS_PER_CHUNK,
    AI_PROVIDER,
)
from ..reconcile import reconcile_questions
from .gemini_provider import GeminiDailyQuotaExceededError
from .schemas import extract_json_payload, normalize_ai_questions


SYSTEM_PROMPT = """
You convert extracted exam PDF text into clean mock-test question JSON.
Return only valid JSON. Do not include markdown.
Use zero-based option indexes.
If an answer is missing or uncertain, choose the most likely option, lower confidence, set needs_review true, and explain in issues.
Keep original meaning. Do not invent questions that are not present in the text.

If a question references a diagram, circuit, graph, chart, or figure that
you can see in the attached page image, set has_diagram to true and report
diagram_bbox as [ymin, xmin, ymax, xmax], each a number from 0 to 1000,
normalized relative to the attached image's own width and height (top-left
corner is [0, 0, 0, 0]; bottom-right is [1000, 1000, 1000, 1000]). Only set
has_diagram to true when the figure is visually present on the page you
were shown - never for a question that merely mentions a diagram in words
with nothing to point to. Set has_diagram to false and diagram_bbox to null
for every question without a visible figure.

has_diagram and diagram_bbox are REQUIRED fields on every single question -
never omit them, and never skip making an explicit decision for a question
just because it looks text-only at a glance. Specifically: for EVERY
question, first check whether its own text contains wording like "shown in
the figure", "as shown below", "given below", "in the diagram", or similar -
if it does, that is a strong signal to look carefully at the page region
near that question for the actual visual (a circuit, geometric figure,
graph, or chart) before deciding has_diagram. Getting this wrong in either
direction is costly: missing a real diagram loses the student a question
they cannot answer without it, and false-flagging a purely textual question
wastes a crop for nothing - so look before you decide, on every question,
rather than defaulting to false out of habit.

If "text", any entry in "options", or "explanation" contains a code snippet,
pseudocode, or program output block, wrap it in markdown code fences:
```language
...
```
where "language" is your best guess at the language (e.g. c, python, java,
cpp, pseudocode). Preserve every line break and level of indentation verbatim.
Do not split prose and code across separate fields - include the fenced code
block directly inside "text", "options", or "explanation" at the position where
it appears relative to the surrounding prose.

If "text", any entry in "options", or "explanation" contains a mathematical
expression - a fraction, exponent, root, integral, summation, matrix, ratio,
Greek letter, or any other notation that would normally be typeset rather
than typed as plain characters - write it as LaTeX and wrap it in math
delimiters: $...$ for an expression inline within a sentence, $$...$$ for a
standalone displayed equation on its own line. Every LaTeX command MUST be
inside a $ or $$ pair - never write a bare command like \\frac{1}{2} or
x^{2} outside delimiters, since anything outside delimiters is rendered as
literal prose and a bare backslash command will show up on the page exactly
as typed, backslash and all, instead of as math. Use standard LaTeX
commands: \\frac{a}{b} for fractions, ^{...} and _{...} for exponents and
subscripts, \\sqrt{...} for roots, \\int, \\sum, \\pi, \\theta, \\times,
\\div, \\left( \\right) for auto-sized brackets, and so on - do not invent
ad hoc notation for something LaTeX already has a command for. A question
with no math in it at all needs no delimiters anywhere; do not wrap plain
numbers or ordinary words in $ signs. Exception: inside a code fence,
leave the text as source code - do not add math delimiters there, even if the
code contains mathematical operators.

If "text" contains a table - a List-I/List-II matching table, a data table,
a comparison table, or any other grid of rows and columns visible on the
page - represent it as a GitHub-Flavored-Markdown table embedded directly
in "text" at the point where it appears, not flattened into a bulleted
paragraph. Every row (including the header) must start and end with `|`,
and the header row must be followed by a separator row of dashes, e.g.:
List-I | List-II
---|---
(A) Rhizopus | (I) Mushroom
(B) Ustilago | (II) Smut fungus
Copy each cell's text/table position exactly as printed - do not try to
pre-match List-I entries to their List-II answers; that pairing is what the
question is testing, and collapsing it here would give away or corrupt the
answer. A question with no table in it needs no `|` characters anywhere;
do not force plain prose into a one-column table.
Expected shape:
{
  "questions": [
    {
      "question_no": 1,
      "topic": null,
      "subtopic": null,
      "passage": null,
      "text": "Question text",
      "options": ["A option", "B option", "C option", "D option"],
      "correct_option_indexes": [0],
      "source_page": 1,
      "confidence": 0,
      "needs_review": true,
      "issues": [],
      "has_diagram": false,
      "diagram_bbox": null
    }
  ]
}
""".strip()

# Distinct from SYSTEM_PROMPT above on purpose: that prompt's job is
# extraction ("do not invent questions that are not present in the text").
# This one's job is the opposite - the text has no questions in it at all
# (it's notes), so the model is explicitly told to author new ones. Keeping
# these as two separate prompts avoids a single blended prompt that's vague
# about which behavior is wanted, which is how models end up either
# inventing questions on real exam PDFs or refusing to generate on notes.
GENERATION_SYSTEM_PROMPT = """
You are writing a multiple-choice quiz to help a student study from their notes.
The text below is study notes - it does not contain any pre-written questions
or answer options. Your job is to WRITE NEW multiple-choice questions that
test understanding of the key concepts, facts, and definitions in the notes.
Return only valid JSON. Do not include markdown.
Write clear, self-contained question stems - do not just copy a sentence
from the notes and blank out a word.
Write exactly 4 options per question: one correct, three plausible but
incorrect distractors.
Use zero-based option indexes.
Every question was authored by you, not verified against an existing answer
key, so set confidence to 50, needs_review to true, and issues to
["Question generated from notes, not extracted from an existing exam"].
If a question or option needs a mathematical expression (a fraction,
exponent, root, or similar), write it as LaTeX wrapped in $...$ for inline
math or $$...$$ for a standalone equation - never write a bare LaTeX
command outside $ delimiters. Skip this entirely for questions with no math
in them.
Expected shape:
{
  "questions": [
    {
      "question_no": 1,
      "topic": null,
      "text": "Question text",
      "options": ["A option", "B option", "C option", "D option"],
      "correct_option_indexes": [0],
      "confidence": 50,
      "needs_review": true,
      "issues": ["Question generated from notes, not extracted from an existing exam"]
    }
  ]
}
""".strip()


def build_notes_generation_prompt(chunk, count):
    return f"""
Write approximately {count} multiple-choice questions covering the key
concepts in this section of notes. Spread the questions across the whole
section rather than clustering them around one paragraph.

Notes:
{chunk}
""".strip()


# template_context comes from processing_jobs.input_config.templateContext
# (see mock-tests.service.js#buildTemplateContext) - present only when this
# job's mock test was created via "Apply Template" (extraction-templates
# .service.js#applyTemplate). None/empty for every other job, in which case
# this returns "" and the prompt is completely unchanged from before this
# feature existed.
#
# Deliberately built as an ADDENDUM appended per-call rather than mutating
# the module-level SYSTEM_PROMPT constant - that constant is shared across
# every job this worker process ever runs, not just the one currently being
# processed, so mutating it would leak one job's template context into every
# other job's prompt until the worker restarts.
def _build_syllabus_guidance(template_context):
    if not template_context:
        return ""

    sections = template_context.get("sections") or []
    template_name = template_context.get("templateName")
    expected_count = template_context.get("expectedQuestionCount")

    lines = []
    if template_name:
        lines.append(
            f'This document is expected to follow the "{template_name}" exam format.'
        )

    if sections:
        lines.append(
            'Classify each question\'s "topic" field using ONLY the section '
            "names listed below - pick whichever one the question's subject "
            "matter actually belongs to. Do not invent a topic name that "
            "isn't in this list, and do not leave topic null just because a "
            "question doesn't obviously fit - pick the closest match. Use "
            '"subtopic" for the more specific concept within that section '
            "if the question clearly matches one of the topics listed under "
            "it, but topic itself must be one of the section names exactly "
            "as written below."
        )
        for section in sections:
            name = section.get("name")
            if not name:
                continue
            topics = section.get("topics") or []
            lines.append(f"- {name}: {', '.join(topics)}" if topics else f"- {name}")

    if expected_count:
        lines.append(
            f"This exam is expected to have approximately {expected_count} "
            "questions in total. This is a guide for sanity-checking your "
            "own extraction, not a hard rule - extract exactly what is "
            "actually present in the PDF; never pad with invented questions "
            "or drop real ones just to hit this number."
        )

    if not lines:
        return ""

    return "\n\nExam format context (from the applied template):\n" + "\n".join(lines)


# Called once, in the wrapper below, against whatever final question list
# a given return path actually produced - so this check applies uniformly
# no matter which of enhance_questions_with_ai's several early-return paths
# (disabled provider, notes-document short-circuit, regex-only fallback,
# full AI+regex merge, ...) ends up being the one that fires, without
# needing the same few lines duplicated at each of them individually.
def _check_template_match(template_context, final_questions):
    if not template_context:
        return None

    expected = template_context.get("expectedQuestionCount")
    if not expected:
        return None

    actual = len(final_questions)
    # Meaningful deviation = more than 15% off OR more than 2 questions off,
    # whichever is the larger absolute gap - a flat percentage alone would
    # be too strict for a small exam (15% of 10 questions rounds to just
    # 1-2) and a flat count alone would be too strict for a large one (2
    # questions off out of 150 is noise, not a real signal).
    threshold = max(2, round(expected * 0.15))
    deviation = abs(actual - expected)

    return {
        "templateName": template_context.get("templateName"),
        "expectedQuestionCount": expected,
        "actualQuestionCount": actual,
        "deviates": deviation > threshold,
    }


# Only called when both the regex parser and normal extraction found zero
# questions - see the "not ai_questions and regex_count == 0" check in
# enhance_questions_with_ai. That combination is the actual signal that the
# PDF is notes rather than an exam with a page or two the parser choked on.
#
# Merging is deliberately NOT done by question_no like the extraction path
# does (questions_by_no dict keyed by question_no). Each chunk's AI response
# restarts its own numbering at 1 - there's no real source numbering to
# preserve here, since these questions don't exist in the original text - so
# a dict merge would silently overwrite chunk 2's "question_no: 1" over
# chunk 1's. Instead every chunk's questions are concatenated into a list
# and renumbered sequentially once, at the end.
def generate_questions_from_notes(pages, provider):
    if not AI_GENERATE_FROM_NOTES or not pages:
        return [], {"attempted": False, "questionsGenerated": 0, "errors": []}

    all_questions = []
    errors = []

    for chunk_index, chunk in enumerate(chunk_pages(pages), start=1):
        if len(all_questions) >= AI_NOTES_MAX_QUESTIONS:
            break

        try:
            response_text = provider.generate_json(
                GENERATION_SYSTEM_PROMPT,
                build_notes_generation_prompt(chunk, AI_NOTES_QUESTIONS_PER_CHUNK),
            )
            payload = extract_json_payload(response_text)
            chunk_questions = normalize_ai_questions(
                payload, source=f"{provider.name}_notes_generated_v1"
            )
            all_questions.extend(chunk_questions)
        except GeminiDailyQuotaExceededError as error:
            # The day's quota can't come back mid-job the way a per-minute
            # one can (see gemini_provider.py's rate limiter/retry) - every
            # remaining chunk would fail identically, so stop here instead
            # of burning through each one's own retry cycle for nothing.
            errors.append(
                {"chunk": chunk_index, "message": f"Stopped early: {error}"}
            )
            break
        except Exception as error:
            errors.append({"chunk": chunk_index, "message": str(error)})

    all_questions = all_questions[:AI_NOTES_MAX_QUESTIONS]
    for index, question in enumerate(all_questions, start=1):
        question["question_no"] = index
        question["metadata"]["generatedFromNotes"] = True

    return all_questions, {
        "attempted": True,
        "questionsGenerated": len(all_questions),
        "errors": errors,
    }


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


def build_metadata_generation_prompt(batch, difficulty_hint):
    """
    batch: a list of {group_index, topic, subtopic, questionType, count}
    dicts - one or more groups to cover in a SINGLE request. Merging
    several small groups into one request (rather than always issuing one
    request per topic/subtopic/type group) is the actual fix for burning
    through Gemini's free-tier 500-requests/day cap: a generation spread
    across many distinct topic/subtopic combinations used to cost one
    request per group even when most groups only needed 1-2 questions -
    see _pack_groups_into_batches below for how groups get merged.

    For a single-group batch, the prompt reads as one plain unnumbered
    request (topic_group_index is never mentioned, and the model is never
    asked to tag anything) - this keeps the common case exactly as
    reliable as it always was, only spending the extra "which group is
    this for" instruction+field on requests that actually need it.
    """
    difficulty_line = (
        ""
        if not difficulty_hint or difficulty_hint == "Variable"
        else f"\nTarget difficulty level for every question: {difficulty_hint}."
    )

    if len(batch) == 1:
        group = batch[0]
        subtopic_line = (
            f' (specifically the subtopic "{group["subtopic"]}")'
            if group.get("subtopic")
            else ""
        )
        type_line = (
            "Every question must have exactly ONE correct option."
            if (group.get("questionType") or "single") == "single"
            else "Every question must have TWO OR MORE correct options (a multi-correct question type)."
        )
        return f"""
Write exactly {group["count"]} original multiple-choice questions on the topic
"{group["topic"]}"{subtopic_line}.
{type_line}{difficulty_line}
""".strip()

    group_lines = []
    for group in batch:
        subtopic_line = (
            f' (specifically the subtopic "{group["subtopic"]}")'
            if group.get("subtopic")
            else ""
        )
        type_line = (
            "single correct option"
            if (group.get("questionType") or "single") == "single"
            else "TWO OR MORE correct options (multi-correct)"
        )
        group_lines.append(
            f'Group {group["group_index"]}: {group["count"]} question(s) on '
            f'"{group["topic"]}"{subtopic_line}, each with {type_line}.'
        )
    group_block = "\n".join(group_lines)

    return f"""
Write questions for EACH of the following {len(batch)} groups, exactly as
many as each one asks for - do not merge, skip, or reallocate counts
between groups.
{group_block}
For every question you write, set "topic_group_index" to the Group number
(the integer right after "Group ") it was written for, and set "topic"
(and "subtopic", if that group has one) to exactly that group's own values -
never invent or substitute a different topic.{difficulty_line}
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


# topic_distribution is a list of {topic, subtopic, questionType, count,
# marksPerCorrect, negativeMarksPerWrong} dicts - see
# mock-tests.repository.js#getTopicDistributionForMockTests and
# mock-tests.service.js#scaleDistributionToTarget for how it's built and
# scaled to sum to exactly the user's requested total.
#
# Batched via _pack_groups_into_batches at up to AI_NOTES_QUESTIONS_PER_CHUNK
# total questions per request, merging multiple small groups into a single
# call wherever there's room rather than always spending one request per
# group (see that function's docstring - this is what actually keeps a
# generation spanning many distinct topics/subtopics from costing one
# request per group against Gemini's free-tier 500/day cap). Each returned
# question is tagged with which group it belongs to via topic_group_index
# (schemas.py) so topic/subtopic/marks can still be force-assigned from our
# own trusted data per group, never taken from the model's own words -
# same principle _apply_section_marks above already uses, just extended to
# work across several groups sharing one response instead of one group per
# response.
def generate_questions_from_metadata(topic_distribution, difficulty_hint, provider):
    if not topic_distribution:
        return [], {"attempted": False, "questionsGenerated": 0, "errors": []}

    all_questions = []
    errors = []

    batches = _pack_groups_into_batches(
        topic_distribution, AI_NOTES_QUESTIONS_PER_CHUNK
    )
    # group_index -> group dict, for force-assigning topic/subtopic/marks
    # once a question's batch response tags it - built once up front
    # rather than re-deriving per batch.
    groups_by_index = {index: group for index, group in enumerate(topic_distribution)}

    for batch in batches:
        try:
            response_text = provider.generate_json(
                METADATA_GENERATION_SYSTEM_PROMPT,
                build_metadata_generation_prompt(batch, difficulty_hint),
            )
            payload = extract_json_payload(response_text)
            batch_questions = normalize_ai_questions(
                payload, source=f"{provider.name}_generated_from_metadata_v1"
            )
        except GeminiDailyQuotaExceededError as error:
            # The day's quota can't come back mid-job the way a per-minute
            # one can (see gemini_provider.py's rate limiter/retry) - every
            # remaining batch would fail identically, so stop the whole
            # generation here rather than cycling through each one's own
            # retry attempts for nothing.
            errors.append({"batch": [g["topic"] for g in batch], "message": f"Stopped early: {error}"})
            break
        except Exception as error:
            errors.append({"batch": [g["topic"] for g in batch], "message": str(error)})
            continue

        # single-group batches never ask the model to tag
        # topic_group_index at all (see build_metadata_generation_prompt),
        # so every question in that case is unambiguously this batch's one
        # and only group - no need to trust a field that was never
        # requested.
        single_group_index = batch[0]["group_index"] if len(batch) == 1 else None

        for question in batch_questions:
            group_index = (
                single_group_index
                if single_group_index is not None
                else question.get("topic_group_index")
            )
            group = groups_by_index.get(group_index)
            if group is None:
                # The model either omitted topic_group_index on a
                # multi-group request or returned one outside this batch's
                # actual groups - there's no trustworthy topic/subtopic/
                # marks to force onto this question, and guessing wrong
                # here means silently mis-scoring or mis-marking a
                # question, which is worse than just dropping it and
                # recording why.
                errors.append(
                    {
                        "batch": [g["topic"] for g in batch],
                        "message": (
                            f"Dropped a question with missing/invalid "
                            f"topic_group_index ({group_index!r}) - "
                            f"could not attribute it to a requested group"
                        ),
                    }
                )
                continue

            # Force topic/subtopic/marks to the requested group's values
            # rather than trusting the model's own classification - the
            # prompt asks for this too, but this is the deterministic
            # guarantee, same pattern _apply_section_marks above already
            # uses for template-driven marking overrides.
            question["topic"] = group["topic"]
            question["subtopic"] = group.get("subtopic")
            question["marks_per_correct"] = group.get("marksPerCorrect")
            question["negative_marks_per_wrong"] = group.get("negativeMarksPerWrong")
            question["metadata"]["generatedFromExistingTests"] = True
            all_questions.append(question)

    # Each batch's normalize_ai_questions call numbers question_no starting
    # from 1 independently within that one response - merging several
    # batches together means those numbers collide (batch 2's question 1
    # has the same question_no as batch 1's question 1). Renumbered once,
    # sequentially, across the FULL merged set at the very end, same as
    # the single-request-per-group version of this function always did.
    for index, question in enumerate(all_questions, start=1):
        question["question_no"] = index

    return all_questions, {
        "attempted": True,
        "questionsGenerated": len(all_questions),
        "errors": errors,
    }


def _attach_diagram_crops(ai_questions, page_images):
    """
    For each question the model flagged has_diagram=True with a usable
    diagram_bbox, crop it from the exact page image rendered for this
    chunk's vision call (page_images, keyed by 1-based page number - see
    gemini_provider.py#generate_json_from_pdf_images) and attach the PNG
    bytes in-memory as "_diagram_crop_bytes".

    This key is NOT part of the question schema - it's a transient
    carrier consumed by db.py#replace_questions when saving the file to
    disk, and must be stripped before a question dict is ever serialized
    into output_summary or any other JSON column (raw image bytes don't
    belong there). worker.py is responsible for stripping it after saving.

    Returns a stats dict - not just silently succeeding/failing per
    question. Losing this observability once already cost real debugging
    time: with no trace of *why* a question with has_diagram=True ended
    up with no crop (source_page mismatch, missing page_images because
    that chunk's fetch failed, or a bad/degenerate bbox), the only way to
    find out was writing standalone diagnostic scripts against a live
    account. Surfacing these counts in output_summary means the very next
    job's own summary answers "did the model even try, and if so where
    did it fail" without needing to reproduce anything.
    """
    stats = {"flaggedByModel": 0, "cropped": 0, "noMatchingPageImage": 0, "cropFailed": 0}

    for question in ai_questions:
        if not question.get("has_diagram") or not question.get("diagram_bbox"):
            continue

        stats["flaggedByModel"] += 1

        source_page = question.get("source_page")
        page_image = page_images.get(source_page) if source_page else None
        if page_image is None and source_page and len(page_images) > 1:
            # The model was explicitly told to use the ABSOLUTE PDF page
            # number for source_page (see SYSTEM_PROMPT and the per-chunk
            # prompt in gemini_provider.py), and does so correctly for
            # the large majority of chunks - but real-world testing
            # against a full document showed it occasionally reverts to
            # POSITION-WITHIN-THIS-CHUNK instead (1st image, 2nd image...)
            # for an entire chunk at a time, seemingly at random, with no
            # single prompt tweak having fully eliminated it. Recovering
            # from it here is more robust than chasing prompt wording
            # further: if source_page isn't a real page in this chunk but
            # IS a valid 1-based index into the chunk's own pages (sorted
            # ascending, matching the order pages were actually attached
            # to the request), treat that as the likely intended page
            # rather than discarding a diagram the model DID correctly
            # locate and box, just under the wrong page-numbering
            # convention.
            chunk_pages_sorted = sorted(page_images.keys())
            if 1 <= source_page <= len(chunk_pages_sorted):
                page_image = page_images[chunk_pages_sorted[source_page - 1]]
        if page_image is None:
            # Model didn't report a usable source_page for this question,
            # or it doesn't match any page actually in this chunk (and
            # isn't a valid position-in-chunk index either) - fall back
            # to the chunk's own single page if it only covered one,
            # otherwise there's no sane page to crop from.
            if len(page_images) == 1:
                page_image = next(iter(page_images.values()))
            else:
                stats["noMatchingPageImage"] += 1
                continue

        crop_bytes = crop_diagram(
            page_image["png_bytes"],
            page_image["width"],
            page_image["height"],
            question["diagram_bbox"],
        )
        if crop_bytes:
            question["_diagram_crop_bytes"] = crop_bytes
            stats["cropped"] += 1
        else:
            stats["cropFailed"] += 1

    return stats


def _missing_question_numbers(questions_by_no, regex_questions):
    # Best-effort "how many questions should there be" estimate: the
    # highest question_no either extractor has actually detected so far.
    # This can undershoot if BOTH extractors miss the true last question,
    # but it's what lets every fallback below target "which numbers are
    # still missing" instead of the old binary "did we get anything at
    # all" (`if not questions_by_no`) - which meant a vision pass that
    # recovered most-but-not-all of the document (a handful of chunks
    # failed even after their retry) silently skipped every fallback below
    # for the rest, since the dict was already non-empty.
    known_numbers = set(questions_by_no) | {q["question_no"] for q in regex_questions}
    if not known_numbers:
        # Nothing has been found by EITHER source yet - we don't know how
        # many questions this document even has, but that's a stronger
        # "keep trying every remaining fallback" signal than a specific
        # gap would be, not a reason to report zero missing and skip
        # every fallback below (an empty set here is falsy, and every
        # caller gates on `if missing:` - returning it directly would
        # silently abandon extraction on total failure instead of trying
        # the next method).
        return {1}
    expected_max = max(known_numbers)
    return set(range(1, expected_max + 1)) - set(questions_by_no)


def get_provider():
    if AI_PROVIDER in ("", "disabled", "none", "off", "false"):
        return None

    if AI_PROVIDER == "openai":
        from .openai_provider import OpenAIProvider

        return OpenAIProvider()

    if AI_PROVIDER == "gemini":
        from .gemini_provider import GeminiProvider

        return GeminiProvider()

    raise RuntimeError(f"Unsupported AI_PROVIDER: {AI_PROVIDER}")


def _enhance_questions_with_ai_inner(
    pages,
    regex_questions,
    pdf_path=None,
    document_type="questions",
    was_scanned=False,
    on_progress=None,
    template_context=None,
):
    def report(message):
        # Best-effort progress checkpoint - never let a progress-reporting
        # failure (e.g. a transient DB hiccup in the caller's callback)
        # take down the actual extraction it's just supposed to be
        # narrating.
        if on_progress:
            try:
                on_progress(message)
            except Exception:
                pass

    # Computed once per job, reused at every call site below that used to
    # pass the bare SYSTEM_PROMPT constant directly - see
    # _build_syllabus_guidance for why this is a per-call addendum rather
    # than a mutation of that shared constant.
    system_prompt = SYSTEM_PROMPT + _build_syllabus_guidance(template_context)

    regex_count = len(regex_questions)
    provider = get_provider()
    if not provider:
        return regex_questions, {
            "enabled": False,
            "provider": "disabled",
            "regexQuestionsParsed": regex_count,
            "questionsFromAi": 0,
            "errors": [],
        }

    # The user told us up front this PDF is notes, not an exam - skip the
    # extraction attempts entirely instead of paying for 1-3 AI calls that
    # are almost certain to come back empty before falling back anyway.
    if document_type == "notes":
        generated_questions, generation_summary = generate_questions_from_notes(pages, provider)
        return generated_questions or regex_questions, {
            "enabled": True,
            "provider": provider.name,
            "regexQuestionsParsed": regex_count,
            "questionsFromAi": 0,
            "errors": generation_summary["errors"],
            "fallback": "generated_from_notes" if generated_questions else "regex_parser",
            "generation": generation_summary,
            "documentType": "notes",
        }

    questions_by_no = {}
    errors = []
    diagram_stats = {"flaggedByModel": 0, "cropped": 0, "noMatchingPageImage": 0, "cropFailed": 0}

    # For a scanned document, OCR has already flattened the page into a 1D
    # text stream - and that flattening can scramble which question number
    # belongs to which question body (we saw this directly on a real exam
    # PDF: Tesseract read a left-margin number column separately from the
    # question-text column, so numbers 6-10 and 12-16 lost their bodies
    # entirely before any parsing even started). A vision model reading the
    # actual page image doesn't have that problem - it sees the 2D layout,
    # not a guess about reading order. So for scanned pages we try
    # image-based extraction FIRST, and only fall back to the OCR-text
    # chunk loop below if that doesn't produce enough questions.
    #
    # For a PDF with a genuine original text layer (was_scanned=False), the
    # OCR-flattening failure mode doesn't apply - the text layer's reading
    # order comes from the PDF itself, not from OCR guessing - so text-first
    # stays the default there, since it's meaningfully cheaper per page.
    # Per-page routing: was_scanned alone (whole-document) misses the JEE
    # case - a genuine text-layer PDF that still has SOME pages with
    # circuit diagrams, graphs, or dense equations mixed in with plain-text
    # pages. Those pages need vision too, even though the document as a
    # whole isn't scanned. pdf_extract.classify_page_content already
    # computed needsVision per page; was_scanned still forces every page in
    # (an OCR'd document has no reliable text-layer reading order at all,
    # per the incident in the comment above), but a non-scanned document
    # now only sends the SPECIFIC pages that actually need it.
    vision_page_numbers = sorted(
        {page_data["page"] for page_data in pages if was_scanned or page_data.get("needsVision")}
    )
    vision_page_set = set(vision_page_numbers)
    text_only_pages = pages if was_scanned else [p for p in pages if p["page"] not in vision_page_set]

    if vision_page_numbers and pdf_path and hasattr(provider, "generate_json_from_pdf_images"):
        # Every entry below is labeled with its TRUE start_page/end_page,
        # always - whether it succeeded or failed (including after its
        # internal retry) - so an error here always names the real pages
        # that need attention, never a shifted position in a shorter list.
        chunk_results = provider.generate_json_from_pdf_images(
            system_prompt,
            build_pdf_prompt(regex_questions),
            pdf_path,
            page_numbers=vision_page_numbers,
            on_progress=lambda chunk_number, total_chunks: report(
                f"AI cleanup (vision {chunk_number}/{total_chunks})"
            ),
        )
        for result in chunk_results:
            pages_label = f"pdf_images_pages_{result['start_page']}-{result['end_page']}"
            if result["error"] or not result["response_text"]:
                errors.append({"chunk": pages_label, "message": result["error"] or "empty response"})
                continue
            try:
                payload = extract_json_payload(result["response_text"])
                ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_image_ai_v1")
                chunk_diagram_stats = _attach_diagram_crops(ai_questions, result.get("page_images") or {})
                for key in diagram_stats:
                    diagram_stats[key] += chunk_diagram_stats[key]
                # This is the FIRST (highest-priority) pass to write into
                # questions_by_no, so unconditional overwrite is fine here
                # - within this same pass, a later chunk winning over an
                # earlier one for the same question_no (e.g. a page split
                # oddly across two chunks) is reasonable last-result-wins
                # behavior. Every pass AFTER this one uses setdefault
                # instead, specifically so it can never clobber what this
                # pass already found.
                for question in ai_questions:
                    questions_by_no[question["question_no"]] = question
            except Exception as error:
                errors.append({"chunk": f"{pages_label}_parse", "message": str(error)})

    # Gated on "which question numbers are still missing" rather than the
    # old "if not questions_by_no" - a vision pass that recovered most (but
    # not all - a couple of chunks still failed even after their retry) of
    # the document used to short-circuit every fallback below entirely,
    # since questions_by_no was already non-empty.
    #
    # Only processes text_only_pages - the pages already sent to vision
    # above would just be re-extracted worse from their (possibly garbled,
    # possibly diagram-only) text layer, wasting a call to recover nothing
    # new.
    missing = _missing_question_numbers(questions_by_no, regex_questions)
    if missing and text_only_pages:
        chunks = list(chunk_pages(text_only_pages))
        total_chunks = len(chunks)
        for chunk_index, chunk in enumerate(chunks, start=1):
            report(f"AI cleanup (text {chunk_index}/{total_chunks})")
            user_prompt = build_user_prompt(chunk, regex_questions)
            try:
                response_text = provider.generate_json(system_prompt, user_prompt)
                payload = extract_json_payload(response_text)
                ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_ai_v1")
                # Only fills question numbers not already found by an
                # earlier, higher-priority pass (the primary vision pass
                # above runs first specifically so it wins) - never
                # overwrites an existing entry, which previously discarded
                # already-successful diagram crops the moment ANY question
                # number was still missing elsewhere in the document (see
                # _attach_diagram_crops / diagram_stats above - a crop
                # recorded there was being silently thrown away right
                # here).
                for question in ai_questions:
                    questions_by_no.setdefault(question["question_no"], question)
            except Exception as error:
                errors.append({"chunk": chunk_index, "message": str(error)})

    # Scanned docs already sent every page to vision above - this fallback
    # now only fires for pages that were text-only-routed (not flagged
    # needsVision) but whose text-chunk pass above still left gaps, e.g. an
    # oddly-formatted text-layer page. Re-tries those SPECIFIC pages
    # through vision as a second opinion, not the whole document again.
    missing = _missing_question_numbers(questions_by_no, regex_questions)
    fallback_vision_pages = sorted({p["page"] for p in text_only_pages}) if not was_scanned else []
    if missing and fallback_vision_pages and pdf_path and hasattr(provider, "generate_json_from_pdf_images"):
        chunk_results = provider.generate_json_from_pdf_images(
            system_prompt,
            build_pdf_prompt(regex_questions),
            pdf_path,
            page_numbers=fallback_vision_pages,
            on_progress=lambda chunk_number, total_chunks: report(
                f"AI cleanup (vision fallback {chunk_number}/{total_chunks})"
            ),
        )
        for result in chunk_results:
            pages_label = f"pdf_images_fallback_pages_{result['start_page']}-{result['end_page']}"
            if result["error"] or not result["response_text"]:
                errors.append({"chunk": pages_label, "message": result["error"] or "empty response"})
                continue
            try:
                payload = extract_json_payload(result["response_text"])
                ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_image_ai_v1")
                chunk_diagram_stats = _attach_diagram_crops(ai_questions, result.get("page_images") or {})
                for key in diagram_stats:
                    diagram_stats[key] += chunk_diagram_stats[key]
                # Gap-fill-only rule (setdefault, not overwrite): this is a
                # "second opinion" retry of specific text-only-routed pages,
                # never authoritative over a question the primary vision
                # pass above already found and possibly cropped a diagram
                # for.
                for question in ai_questions:
                    questions_by_no.setdefault(question["question_no"], question)
            except Exception as error:
                errors.append({"chunk": f"{pages_label}_parse", "message": str(error)})

    missing = _missing_question_numbers(questions_by_no, regex_questions)
    if missing and pdf_path and hasattr(provider, "generate_json_from_pdf"):
        try:
            response_text = provider.generate_json_from_pdf(
                system_prompt,
                build_pdf_prompt(regex_questions),
                pdf_path,
            )
            payload = extract_json_payload(response_text)
            ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_pdf_ai_v1")
            # This is the LAST-resort, lowest-fidelity pass - it reads the
            # raw PDF file directly rather than rendered page images, so it
            # structurally CANNOT crop a diagram (no page_images exist for
            # it to crop from - _attach_diagram_crops is never called for
            # this path at all). Previously this loop overwrote every
            # question_no it returned unconditionally, which meant ANY
            # remaining gap elsewhere in the document (a completely
            # unrelated missing question) caused this pass to run and
            # silently re-clobber EVERY already-successful vision result
            # with a diagram-crop-incapable duplicate - discarding correct,
            # already-cropped diagrams for questions that were never
            # actually missing. setdefault fixes that: this pass can only
            # ever fill in numbers no earlier pass found.
            for question in ai_questions:
                questions_by_no.setdefault(question["question_no"], question)
        except Exception as error:
            errors.append({"chunk": "pdf", "message": str(error)})

    ai_questions = [questions_by_no[key] for key in sorted(questions_by_no)]

    # Both the regex parser AND every extraction attempt found nothing -
    # that combination (not just "AI found nothing") is what tells us this
    # is probably notes, not an exam with a couple of unparseable pages.
    if not ai_questions and regex_count == 0:
        generated_questions, generation_summary = generate_questions_from_notes(pages, provider)

        if generated_questions:
            return generated_questions, {
                "enabled": True,
                "provider": provider.name,
                "regexQuestionsParsed": regex_count,
                "questionsFromAi": 0,
                "errors": errors,
                "fallback": "generated_from_notes",
                "generation": generation_summary,
            }

        errors.extend(
            {**generation_error, "phase": "notes_generation"}
            for generation_error in generation_summary["errors"]
        )

    if not ai_questions:
        final_missing = sorted(
            _missing_question_numbers({q["question_no"]: q for q in regex_questions}, regex_questions)
        )
        return regex_questions, {
            "enabled": True,
            "provider": provider.name,
            "regexQuestionsParsed": regex_count,
            "questionsFromAi": 0,
            "errors": errors,
            "fallback": "regex_parser",
            "documentType": "questions",
            "visionFirst": was_scanned,
            "missingQuestionNumbers": final_missing,
            "diagramStats": diagram_stats,
        }

    # AI found *something*. Reconcile it with the regex parser's result
    # per-question, with AI taking unconditional priority - see reconcile.py
    # for why regex is now a gap-filler only, never a competitor.
    merged_questions, merge_decisions = reconcile_questions(regex_questions, ai_questions)

    # Question numbers neither extractor ever produced, computed against
    # the FINAL merged result (not just the AI-only pool) - the real
    # "this job did not recover the whole document" signal, so an
    # incomplete extraction is visible in output_summary instead of
    # completing silently as if nothing were missing.
    merged_by_no = {q["question_no"]: q for q in merged_questions}
    final_missing = sorted(_missing_question_numbers(merged_by_no, regex_questions))

    return merged_questions, {
        "enabled": True,
        "provider": provider.name,
        "regexQuestionsParsed": regex_count,
        "questionsFromAi": len(ai_questions),
        "questionsMerged": len(merged_questions),
        "errors": errors,
        "fallback": "ai_priority_with_regex_gapfill",
        "mergeDecisions": merge_decisions,
        "documentType": "questions",
        "visionFirst": was_scanned,
        "missingQuestionNumbers": final_missing,
        "diagramStats": diagram_stats,
    }


# Applied to the FINAL question list only, at the same call site as
# _check_template_match and for the same reason: this needs to run exactly
# once regardless of which of _enhance_questions_with_ai_inner's several
# return paths (disabled provider, notes-generated, regex-only fallback,
# full AI+regex merge) produced the list, rather than duplicated at each of
# those return statements - and it needs to run AFTER reconcile_questions,
# not before, since reconcile.py's per-question merge only knows about the
# extraction schema's own fields and would silently drop anything added
# earlier.
#
# Every question already has a "topic" by this point that - whenever
# sections were supplied - the model was instructed to pick EXCLUSIVELY
# from the section names in template_context["sections"] (see
# _build_syllabus_guidance). This turns that classification into an actual
# scoring override: marks_per_correct/negative_marks_per_wrong get set on
# the question dict here, which worker.py -> db.py#replace_questions then
# persists onto questions.marks_per_correct / .negative_marks_per_wrong -
# both nullable columns that already existed before this feature (see
# migrations/001_initial_schema.sql; the question editor has always let a
# user set these by hand per-question). attempts.service.js's scoring
# already falls back per-question -> mock test default whenever a
# question's own value is NULL:
#   const marksPerCorrect = row.question_marks_per_correct ?? mockTest.marks_per_correct
# so a section with no override, or a question the model couldn't
# confidently classify into any section, is deliberately left alone here
# (both keys stay absent) rather than being defaulted to something that
# would shadow that fallback.
def _apply_section_marks(template_context, questions):
    if not template_context:
        return {"sectionsWithOverrides": 0, "questionsMatched": 0}

    sections = template_context.get("sections") or []
    overrides_by_name = {}
    for section in sections:
        name = section.get("name")
        if not name:
            continue
        marks = section.get("marksPerCorrect")
        negative = section.get("negativeMarksPerWrong")
        if marks is None and negative is None:
            continue
        overrides_by_name[name] = {
            "marks_per_correct": marks,
            "negative_marks_per_wrong": negative,
        }

    if not overrides_by_name:
        return {"sectionsWithOverrides": 0, "questionsMatched": 0}

    matched = 0
    for question in questions:
        override = overrides_by_name.get(question.get("topic"))
        if not override:
            continue

        if override["marks_per_correct"] is not None:
            question["marks_per_correct"] = override["marks_per_correct"]
        if override["negative_marks_per_wrong"] is not None:
            question["negative_marks_per_wrong"] = override["negative_marks_per_wrong"]
        matched += 1

    return {
        "sectionsWithOverrides": len(overrides_by_name),
        "questionsMatched": matched,
    }


# Public entry point (worker.py calls this one). Wraps
# _enhance_questions_with_ai_inner purely so _check_template_match and
# _apply_section_marks each run against whatever final question list
# actually came back, exactly once, regardless of which of that function's
# several early-return paths (a disabled provider, a notes-document
# short-circuit, a regex-only fallback when every AI attempt failed, or the
# full AI+regex merge) is the one that happened to fire - instead of
# needing the same few lines duplicated at each of those five-plus return
# statements individually, with the real risk of a future one added there
# getting missed.
def enhance_questions_with_ai(
    pages,
    regex_questions,
    pdf_path=None,
    document_type="questions",
    was_scanned=False,
    on_progress=None,
    template_context=None,
):
    questions, summary = _enhance_questions_with_ai_inner(
        pages,
        regex_questions,
        pdf_path=pdf_path,
        document_type=document_type,
        was_scanned=was_scanned,
        on_progress=on_progress,
        template_context=template_context,
    )

    template_match = _check_template_match(template_context, questions)
    if template_match:
        summary["templateMatch"] = template_match

    section_marks = _apply_section_marks(template_context, questions)
    if section_marks["sectionsWithOverrides"]:
        summary["sectionMarksApplied"] = section_marks

    return questions, summary


def chunk_pages(pages):
    chunks = []
    current = []
    current_size = 0

    for page in pages:
        page_text = f"\n\n[PAGE {page['page']}]\n{page['text']}"
        if current and current_size + len(page_text) > AI_MAX_CHARS_PER_CHUNK:
            chunks.append("".join(current))
            current = []
            current_size = 0

        current.append(page_text)
        current_size += len(page_text)

    if current:
        chunks.append("".join(current))

    return chunks


def build_user_prompt(chunk, regex_questions):
    regex_preview = [
        {
            "question_no": question.get("question_no"),
            "text": question.get("text"),
            "options": question.get("options"),
            "correct_option_indexes": question.get("correct_option_indexes"),
            "confidence": question.get("confidence"),
        }
        for question in regex_questions[:20]
    ]

    return f"""
Extract and clean all MCQ questions from this PDF text chunk.
Use the regex parser preview as hints only. Prefer the PDF text when there is a conflict.
No page image is attached for this chunk - leave has_diagram false and
diagram_bbox null for every question here, even if the text mentions a
figure; diagram detection only happens on the vision extraction path,
which has the actual page image to look at.

Regex parser preview:
{regex_preview}

PDF text chunk:
{chunk}
""".strip()


def build_pdf_prompt(regex_questions):
    regex_preview = [
        {
            "question_no": question.get("question_no"),
            "text": question.get("text"),
            "options": question.get("options"),
            "correct_option_indexes": question.get("correct_option_indexes"),
            "confidence": question.get("confidence"),
        }
        for question in regex_questions[:20]
    ]

    return f"""
Extract and clean all MCQ questions from the attached PDF.
This may be a scanned PDF, so inspect the PDF content directly.
Use the regex parser preview as hints only. If the preview is empty, rely on the PDF.

Regex parser preview:
{regex_preview}
""".strip()