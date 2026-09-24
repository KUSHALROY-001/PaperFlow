"""Core PDF extraction pipeline: chunking, prompting the AI provider,
reconciling results against the regex-extracted question list, and
persisting the final question set. This used to be a single ~2,300-line
file holding several unrelated features; those were split into sibling
modules (notes_generation.py, metadata_generation.py,
duplicate_regeneration.py, template_generation.py, question_matching.py,
diagram_crops.py, marking_scheme.py, topic_batching.py) - see
backend/worker/ARCHITECTURE.md for what lives where and why.
"""

import threading
from concurrent.futures import ThreadPoolExecutor

from ...config import AI_MAX_CHARS_PER_CHUNK, AI_PROVIDER, AI_TEXT_CHUNK_CONCURRENCY
from ...reconcile import reconcile_questions
from ..gemini_provider import GeminiDailyQuotaExceededError
from ..schema import extract_json_payload, normalize_ai_questions
from .diagram_crops import _attach_diagram_crops
from .marking_scheme import prepare_questions_for_persistence
from .notes_generation import generate_questions_from_notes
from .question_matching import _missing_question_numbers, _put_extracted_question

SYSTEM_PROMPT = """
You convert extracted exam PDF text into clean mock-test question JSON.
Return only valid JSON. Do not include markdown.
Use zero-based option indexes.
If an answer is missing or uncertain, choose the most likely option, lower confidence, set needs_review true, and explain in issues.
Keep original meaning. Do not invent questions that are not present in the text.
Classify every question as single, multi, fill_blank, short_answer,
long_answer, or numerical. Do not convert written or numerical questions
into fake MCQs. A visible blank (____) is fill_blank; a requested brief
response is short_answer; an extended explanation or stated word count is
long_answer; and a number-only answer box/instruction is numerical. For
written questions, derive grading_rubric from the paper's marking scheme
when it is visible; otherwise provide expected_answer.
Never write filler stems such as "Reasoning question 21" or "English question 1",
and never use the bare letters A/B/C/D as the option text unless that is
literally all the paper prints for that choice. If a page is an answer key
(numbers mapped to A-D with no question stems), return {"questions": []} -
do not invent questions from the key.

For every visible diagram, circuit, graph, chart, or figure belonging to a
question, add an entry to that question's required "diagrams" list with a
unique slot_key and bbox [ymin, xmin, ymax, xmax]. Coordinates are 0-1000
relative to the attached image. Keep the list empty when the question has no
visible figure; never create an image merely because the text mentions one.
Every diagram - including a single one - needs a matching ![[img:slot_key]]
marker placed at the exact point in text, an option, or a markdown-table
cell where that image belongs, relative to the surrounding prose (before
it, after it, or wherever it visually sits in the source). For exactly one
diagram use slot_key "default"; for multiple diagrams use descriptive slot
keys. Every slot, "default" included, must have its own marker - there is
no implicit position for an image without one.

This applies to the ANSWER OPTIONS just as much as to the question stem: if
an option IS a picture rather than text - a structure, a graph, a circuit,
a shape, or any other figure the test-taker must visually compare, with no
equivalent written description anywhere in the question - that option still
needs its own "diagrams" entry with its own slot_key and its own
![[img:slot_key]] marker placed as that option's ENTIRE string in "options"
(e.g. options: ["![[img:option-a]]", "![[img:option-b]]", ...], never a bare
"(A)"/"(B)" label with no marker at all - a bare label loses the answer
choice entirely, since nothing else in the JSON records what that option
actually shows). This is easy to under-detect when one clearly-labeled
diagram already appears right after the question stem: do not let finding
that one diagram stop you from separately checking each option for whether
it is ALSO a picture - a question can have five diagrams (one in the stem,
one per option) just as easily as one.

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
      "diagrams": []
    }
  ]
}
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
    marking_scheme = template_context.get("markingScheme") or {}
    question_types = template_context.get("questionTypes") or []
    default_marks = template_context.get("marksPerCorrect")
    default_negative = template_context.get("negativeMarksPerWrong")

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
            section_line = f"- {name}: {', '.join(topics)}" if topics else f"- {name}"
            marks = section.get("marksPerCorrect")
            negative = section.get("negativeMarksPerWrong")
            score_bits = []
            if marks is not None:
                score_bits.append(f"+{marks} for correct")
            if negative is not None:
                score_bits.append(f"-{negative} for wrong")
            if score_bits:
                section_line += f" (marking: {', '.join(score_bits)})"
            lines.append(section_line)

    if marking_scheme or question_types or (
        default_marks is not None
        and float(default_marks or 0) == 0
        and default_negative is not None
        and float(default_negative or 0) == 0
    ):
        lines.append("PER-QUESTION MARKING (required for this template):")
        if marking_scheme:
            scheme_type = marking_scheme.get("type") or "custom"
            description = marking_scheme.get("description") or ""
            lines.append(
                f'The applied template uses a "{scheme_type}" marking scheme'
                + (f": {description}" if description else ".")
            )
            if marking_scheme.get("partial_marking"):
                lines.append(
                    "Partial marking may apply for some question types "
                    "(e.g. multiple-correct). Still set marks_per_correct to "
                    "the FULL marks for a completely correct answer, and "
                    "negative_marks_per_wrong to the deduction for an "
                    "incorrect response (0 when the type has no negative "
                    "marking)."
                )
            by_type = marking_scheme.get("by_question_type") or marking_scheme.get(
                "byQuestionType"
            )
            if isinstance(by_type, dict) and by_type:
                lines.append(
                    "Use these per-question-type marks when the paper's "
                    "instructions match (prefer the paper if they conflict):"
                )
                for qtype, scores in by_type.items():
                    if not isinstance(scores, dict):
                        continue
                    plus = scores.get("marksPerCorrect", scores.get("marks_per_correct"))
                    minus = scores.get(
                        "negativeMarksPerWrong", scores.get("negative_marks_per_wrong")
                    )
                    lines.append(
                        f"  - {qtype}: +{plus} correct"
                        + (f", -{minus} wrong" if minus is not None else "")
                    )
        if question_types:
            lines.append(
                "Expected question types in this paper: "
                + ", ".join(str(t) for t in question_types)
                + ". Identify each question's type from its stem / options / "
                "section header on the page, then set marks_per_correct and "
                "negative_marks_per_wrong from the paper's marking "
                "instructions for that type."
            )
        lines.append(
            "You MUST set marks_per_correct and negative_marks_per_wrong on "
            "EVERY extracted question when the paper (or the scheme above) "
            "specifies them. Do not leave both null unless the paper truly "
            "gives no scoring information for that question."
        )
    elif default_marks is not None or default_negative is not None:
        lines.append(
            "Default marking for this template (use on every question "
            "unless a section override or the paper itself states otherwise): "
            f"+{default_marks if default_marks is not None else '?'} correct, "
            f"-{default_negative if default_negative is not None else '?'} wrong. "
            "Still set marks_per_correct and negative_marks_per_wrong on each "
            "question to these values when the paper is uniform."
        )

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
    on_vision_chunk=None,
    template_context=None,
    desired_question_count=None,
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
    expected_count = (template_context or {}).get("expectedQuestionCount")

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
        generated_questions, generation_summary = generate_questions_from_notes(
            pages,
            provider,
            pdf_path,
            desired_count=desired_question_count,
        )
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
        {
            page_data["page"]
            for page_data in pages
            if (was_scanned or page_data.get("needsVision"))
            and not page_data.get("isAnswerKey")
        }
    )
    vision_page_set = set(vision_page_numbers)
    text_only_pages = [
        page
        for page in (pages if was_scanned else [p for p in pages if p["page"] not in vision_page_set])
        if not page.get("isAnswerKey")
    ]

    if vision_page_numbers and pdf_path and hasattr(provider, "generate_json_from_pdf_images"):
        # Every entry below is labeled with its TRUE start_page/end_page,
        # always - whether it succeeded or failed (including after its
        # internal retry) - so an error here always names the real pages
        # that need attention, never a shifted position in a shorter list.
        def handle_vision_result(result):
            pages_label = f"pdf_images_pages_{result['start_page']}-{result['end_page']}"
            if result["error"] or not result["response_text"]:
                errors.append({"chunk": pages_label, "message": result["error"] or "empty response"})
                return
            try:
                payload = extract_json_payload(result["response_text"])
                ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_image_ai_v1")
                chunk_diagram_stats = _attach_diagram_crops(ai_questions, result.get("page_images") or {})
                for key in diagram_stats:
                    diagram_stats[key] += chunk_diagram_stats[key]

                before = dict(questions_by_no)
                for question in ai_questions:
                    _put_extracted_question(questions_by_no, question, prefer_new=True)
                changed_questions = [
                    question
                    for number, question in questions_by_no.items()
                    if before.get(number) is not question
                ]
            except Exception as error:
                errors.append({"chunk": f"{pages_label}_parse", "message": str(error)})
                return

            if changed_questions and on_vision_chunk:
                # Persistence failures must remain real worker failures.
                # They are not malformed AI JSON and must not be swallowed
                # into the chunk's recoverable parse-error list.
                on_vision_chunk(changed_questions, result)

        chunk_results = provider.generate_json_from_pdf_images(
            system_prompt,
            build_pdf_prompt(regex_questions),
            pdf_path,
            page_numbers=vision_page_numbers,
            on_progress=lambda chunk_number, total_chunks: report(
                f"AI cleanup (vision {chunk_number}/{total_chunks})"
            ),
            on_result=handle_vision_result,
        )

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
    missing = _missing_question_numbers(questions_by_no, regex_questions, expected_count)
    if missing and text_only_pages:
        chunks = list(chunk_pages(text_only_pages))
        total_chunks = len(chunks)

        # Keep the merge deterministic even though the requests themselves
        # overlap: executor.map yields results in the original text-chunk
        # order. That preserves the existing collision behaviour in
        # _put_extracted_question while removing idle network wait time.
        daily_quota_event = threading.Event()
        daily_quota_message = {"value": ""}

        def process_text_chunk(job):
            if daily_quota_event.is_set():
                return {
                    "chunk_index": job["chunk_index"],
                    "error": f"Skipped - {daily_quota_message['value']}",
                }

            try:
                return {
                    "chunk_index": job["chunk_index"],
                    "response_text": provider.generate_json(system_prompt, job["user_prompt"]),
                }
            except GeminiDailyQuotaExceededError as error:
                daily_quota_message["value"] = str(error)
                daily_quota_event.set()
                return {
                    "chunk_index": job["chunk_index"],
                    "error": f"Stopped early: {error}",
                }
            except Exception as error:
                return {"chunk_index": job["chunk_index"], "error": str(error)}

        text_jobs = [
            {
                "chunk_index": chunk_index,
                "user_prompt": build_user_prompt(chunk, regex_questions),
            }
            for chunk_index, chunk in enumerate(chunks, start=1)
        ]
        with ThreadPoolExecutor(max_workers=AI_TEXT_CHUNK_CONCURRENCY) as executor:
            for completed, result in enumerate(executor.map(process_text_chunk, text_jobs), start=1):
                report(f"AI cleanup (text {completed}/{total_chunks})")
                chunk_index = result["chunk_index"]
                if result.get("error"):
                    errors.append({"chunk": chunk_index, "message": result["error"]})
                    continue

                try:
                    payload = extract_json_payload(result["response_text"])
                    ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_ai_v1")
                    # Gap-fill only for true overlaps; subject restarts still
                    # get a new global number (prefer_new=False keeps the
                    # earlier vision result when bodies match).
                    for question in ai_questions:
                        _put_extracted_question(
                            questions_by_no, question, prefer_new=False
                        )
                except Exception as error:
                    errors.append({"chunk": chunk_index, "message": str(error)})

    # Scanned docs already sent every page to vision above - this fallback
    # now only fires for pages that were text-only-routed (not flagged
    # needsVision) but whose text-chunk pass above still left gaps, e.g. an
    # oddly-formatted text-layer page. Re-tries those SPECIFIC pages
    # through vision as a second opinion, not the whole document again.
    missing = _missing_question_numbers(questions_by_no, regex_questions, expected_count)
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
                # Gap-fill / second opinion only; subject restarts still
                # preserved under a new global number.
                for question in ai_questions:
                    _put_extracted_question(
                        questions_by_no, question, prefer_new=False
                    )
            except Exception as error:
                errors.append({"chunk": f"{pages_label}_parse", "message": str(error)})

    missing = _missing_question_numbers(questions_by_no, regex_questions, expected_count)
    if missing and pdf_path and hasattr(provider, "generate_json_from_pdf"):
        try:
            response_text = provider.generate_json_from_pdf(
                system_prompt,
                build_pdf_prompt(regex_questions),
                pdf_path,
            )
            payload = extract_json_payload(response_text)
            ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_pdf_ai_v1")
            # Last-resort PDF text pass: never clobber an earlier vision
            # result for the same body; still keeps subject-restart
            # collisions under new global numbers.
            for question in ai_questions:
                _put_extracted_question(
                    questions_by_no, question, prefer_new=False
                )
        except Exception as error:
            errors.append({"chunk": "pdf", "message": str(error)})

    ai_questions = [questions_by_no[key] for key in sorted(questions_by_no)]

    # Both the regex parser AND every extraction attempt found nothing -
    # that combination (not just "AI found nothing") is what tells us this
    # is probably notes, not an exam with a couple of unparseable pages.
    if not ai_questions and regex_count == 0:
        generated_questions, generation_summary = generate_questions_from_notes(pages, provider, pdf_path)

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
            _missing_question_numbers(
                {q["question_no"]: q for q in regex_questions}, regex_questions, expected_count
            )
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
    final_missing = sorted(
        _missing_question_numbers(merged_by_no, regex_questions, expected_count)
    )

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


def enhance_questions_with_ai(
    pages,
    regex_questions,
    pdf_path=None,
    document_type="questions",
    was_scanned=False,
    on_progress=None,
    on_vision_chunk=None,
    template_context=None,
    desired_question_count=None,
):
    questions, summary = _enhance_questions_with_ai_inner(
        pages,
        regex_questions,
        pdf_path=pdf_path,
        document_type=document_type,
        was_scanned=was_scanned,
        on_progress=on_progress,
        on_vision_chunk=on_vision_chunk,
        template_context=template_context,
        desired_question_count=desired_question_count,
    )

    # _apply_section_marks needs question_type to match
    # markingScheme.by_question_type, but the schema never asks the AI for
    # it (see _classify_question_type_label) and db.py otherwise only
    # derives this at insert time - too late for section-marks matching to
    # ever see it. Derive it here, from the same rule db.py uses, so both
    # places agree on what "multi" means; respect an existing value first
    # in case a future extraction path ever sets one explicitly.
    template_match = _check_template_match(template_context, questions)
    if template_match:
        summary["templateMatch"] = template_match

    section_marks = prepare_questions_for_persistence(questions, template_context)
    if (
        section_marks["sectionsWithOverrides"]
        or section_marks["typesWithOverrides"]
        or section_marks["unmappedQuestionTypes"]
    ):
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
No page image is attached for this chunk - leave diagrams as an empty list
for every question here, even if the text mentions a figure; diagram
detection only happens on the vision extraction path,
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
The preview is an incomplete SAMPLE of questions found elsewhere in the document
- it is not a complete list, and it is not limited to the attached pages.
Extract EVERY question actually visible on the attached pages, including
those whose numbers are not in the preview.
If the attached pages are an answer key (question numbers mapped to A-D
with no stems), return an empty questions list. Do not invent filler
such as "Reasoning question 21" with options A/B/C/D.

Regex parser preview:
{regex_preview}
""".strip()

