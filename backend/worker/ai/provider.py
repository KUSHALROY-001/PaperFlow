from ..config import (
    AI_GENERATE_FROM_NOTES,
    AI_MAX_CHARS_PER_CHUNK,
    AI_NOTES_MAX_QUESTIONS,
    AI_NOTES_QUESTIONS_PER_CHUNK,
    AI_PROVIDER,
)
from ..reconcile import reconcile_questions
from .schemas import extract_json_payload, normalize_ai_questions


SYSTEM_PROMPT = """
You convert extracted exam PDF text into clean mock-test question JSON.
Return only valid JSON. Do not include markdown.
Use zero-based option indexes.
If an answer is missing or uncertain, choose the most likely option, lower confidence, set needs_review true, and explain in issues.
Keep original meaning. Do not invent questions that are not present in the text.
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
      "issues": []
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


def enhance_questions_with_ai(
    pages,
    regex_questions,
    pdf_path=None,
    document_type="questions",
    was_scanned=False,
    on_progress=None,
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
    if was_scanned and pdf_path and hasattr(provider, "generate_json_from_pdf_images"):
        # Every entry below is labeled with its TRUE start_page/end_page,
        # always - whether it succeeded or failed (including after its
        # internal retry) - so an error here always names the real pages
        # that need attention, never a shifted position in a shorter list.
        chunk_results = provider.generate_json_from_pdf_images(
            SYSTEM_PROMPT,
            build_pdf_prompt(regex_questions),
            pdf_path,
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
                for question in ai_questions:
                    questions_by_no[question["question_no"]] = question
            except Exception as error:
                errors.append({"chunk": f"{pages_label}_parse", "message": str(error)})

    # Gated on "which question numbers are still missing" rather than the
    # old "if not questions_by_no" - a vision pass that recovered most (but
    # not all - a couple of chunks still failed even after their retry) of
    # the document used to short-circuit every fallback below entirely,
    # since questions_by_no was already non-empty.
    missing = _missing_question_numbers(questions_by_no, regex_questions)
    if missing:
        chunks = list(chunk_pages(pages))
        total_chunks = len(chunks)
        for chunk_index, chunk in enumerate(chunks, start=1):
            report(f"AI cleanup (text {chunk_index}/{total_chunks})")
            user_prompt = build_user_prompt(chunk, regex_questions)
            try:
                response_text = provider.generate_json(SYSTEM_PROMPT, user_prompt)
                payload = extract_json_payload(response_text)
                ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_ai_v1")
                for question in ai_questions:
                    questions_by_no[question["question_no"]] = question
            except Exception as error:
                errors.append({"chunk": chunk_index, "message": str(error)})

    # Scanned docs already tried images first above - this fallback now only
    # fires for a non-scanned (genuine text-layer) PDF whose text-chunk pass
    # above still left gaps, e.g. an oddly-formatted text-layer PDF.
    missing = _missing_question_numbers(questions_by_no, regex_questions)
    if missing and not was_scanned and pdf_path and hasattr(provider, "generate_json_from_pdf_images"):
        chunk_results = provider.generate_json_from_pdf_images(
            SYSTEM_PROMPT,
            build_pdf_prompt(regex_questions),
            pdf_path,
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
                for question in ai_questions:
                    questions_by_no[question["question_no"]] = question
            except Exception as error:
                errors.append({"chunk": f"{pages_label}_parse", "message": str(error)})

    missing = _missing_question_numbers(questions_by_no, regex_questions)
    if missing and pdf_path and hasattr(provider, "generate_json_from_pdf"):
        try:
            response_text = provider.generate_json_from_pdf(
                SYSTEM_PROMPT,
                build_pdf_prompt(regex_questions),
                pdf_path,
            )
            payload = extract_json_payload(response_text)
            ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_pdf_ai_v1")
            for question in ai_questions:
                questions_by_no[question["question_no"]] = question
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
    }


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