"""Study-notes question generation: PDF text with no pre-written questions,
so the model is asked to author new ones instead of extracting existing
text. Split out of provider.py - see backend/worker/ARCHITECTURE.md.
"""

from ...config import (
    AI_GENERATE_FROM_NOTES,
    AI_MAX_CHARS_PER_CHUNK,
    AI_NOTES_MAX_QUESTIONS,
    AI_NOTES_QUESTIONS_PER_CHUNK,
    AI_PDF_PAGES_PER_CHUNK,
)
from ..gemini_provider import GeminiDailyQuotaExceededError
from ..schema import extract_json_payload, normalize_ai_questions

# Distinct from provider.py's SYSTEM_PROMPT constant on purpose: that prompt's job is
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


# Companion to build_notes_generation_prompt for pages with no usable text
# layer (handwritten/scanned notes, or notes where OCR isn't available/
# failed - see generate_questions_from_notes). No "Notes:" text block here,
# unlike the text version above - the actual content arrives as attached
# page images via generate_json_from_pdf_images, which appends its own
# "Attached images are PDF pages X to Y..." line to whatever prompt this
# returns, so this only needs to state the task.
def build_notes_generation_vision_prompt(count):
    return f"""
Write approximately {count} multiple-choice questions covering the key
concepts shown on the attached page images. Spread the questions across
the whole set of pages rather than clustering them around one page.
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
def _spread_indices(k, n):
    """Pick k indices evenly spaced across range(n).

    First and last are always included when k > 1 so a small sample of a
    long document still covers start and end rather than clustering at the
    front. Integer division guarantees uniqueness whenever k <= n.
    """
    if k <= 0 or n <= 0:
        return []
    k = min(int(k), int(n))
    if k == 1:
        return [0]
    return [i * (n - 1) // (k - 1) for i in range(k)]


def _allocate_counts(total, n):
    """Split `total` into n non-negative ints whose sum is total.

    Each slot gets total // n; the remainder is +1 on slots chosen by
    _spread_indices so extras aren't dumped on the first few items.
    """
    if n <= 0:
        return []
    total = max(0, int(total))
    base, remainder = divmod(total, n)
    counts = [base] * n
    for index in _spread_indices(remainder, n):
        counts[index] += 1
    return counts


def _spread_keep(items, keep):
    """Keep `keep` items spread across the list instead of cutting the tail."""
    if keep >= len(items):
        return list(items)
    if keep <= 0:
        return []
    indices = set(_spread_indices(keep, len(items)))
    return [item for index, item in enumerate(items) if index in indices]


def _normalize_desired_count(value):
    if value is None or value is False or value == "":
        return None
    try:
        count = int(value)
    except (TypeError, ValueError):
        return None
    if count < 1:
        return None
    return min(count, AI_NOTES_MAX_QUESTIONS)


def _group_consecutive_pages(page_numbers, chunk_size):
    if not page_numbers:
        return []
    runs = []
    current_run = [page_numbers[0]]
    for page in page_numbers[1:]:
        if page == current_run[-1] + 1:
            current_run.append(page)
        else:
            runs.append(current_run)
            current_run = [page]
    runs.append(current_run)

    chunks = []
    for run in runs:
        for start in range(0, len(run), chunk_size):
            chunks.append(run[start : start + chunk_size])
    return chunks


def _text_work_items(pages):
    items = []
    current = []
    current_size = 0
    current_start = None

    for page in pages:
        page_text = f"\n\n[PAGE {page['page']}]\n{page['text']}"
        if current and current_size + len(page_text) > AI_MAX_CHARS_PER_CHUNK:
            items.append(
                {
                    "kind": "text",
                    "start_page": current_start,
                    "chunk": "".join(current),
                }
            )
            current = []
            current_size = 0
            current_start = None

        if current_start is None:
            current_start = page["page"]
        current.append(page_text)
        current_size += len(page_text)

    if current:
        items.append(
            {
                "kind": "text",
                "start_page": current_start,
                "chunk": "".join(current),
            }
        )
    return items


def _notes_work_items(pages, provider, pdf_path):
    """Vision groups and text chunks, ordered by first page in the document."""
    text_pages = [page for page in pages if (page.get("text") or "").strip()]
    vision_page_numbers = sorted(
        page["page"] for page in pages if not (page.get("text") or "").strip()
    )
    items = []
    can_vision = bool(
        vision_page_numbers
        and pdf_path
        and hasattr(provider, "generate_json_from_pdf_images")
    )
    if can_vision:
        for group in _group_consecutive_pages(
            vision_page_numbers, AI_PDF_PAGES_PER_CHUNK
        ):
            items.append(
                {
                    "kind": "vision",
                    "start_page": group[0],
                    "page_numbers": group,
                }
            )
    items.extend(_text_work_items(text_pages))
    items.sort(key=lambda item: item["start_page"])
    return items


def _select_notes_work(items, desired_count):
    """Choose which chunks to call and how many questions each should write.

    No desired_count: every chunk, AI_NOTES_QUESTIONS_PER_CHUNK each
    (today's behavior). A small requested count picks evenly spaced
    chunks instead of only the start of the PDF.
    """
    total_chunks = len(items)
    if total_chunks == 0:
        return [], []

    if desired_count is None:
        return list(items), [AI_NOTES_QUESTIONS_PER_CHUNK] * total_chunks

    if desired_count >= total_chunks:
        return list(items), _allocate_counts(desired_count, total_chunks)

    selected_indexes = _spread_indices(desired_count, total_chunks)
    selected = [items[index] for index in selected_indexes]
    return selected, _allocate_counts(desired_count, len(selected))


def generate_questions_from_notes(
    pages, provider, pdf_path=None, desired_count=None
):
    if not AI_GENERATE_FROM_NOTES or not pages:
        return [], {"attempted": False, "questionsGenerated": 0, "errors": []}

    desired_count = _normalize_desired_count(desired_count)
    all_questions = []
    errors = []
    work_items, per_item_counts = _select_notes_work(
        _notes_work_items(pages, provider, pdf_path), desired_count
    )
    cap = desired_count if desired_count is not None else AI_NOTES_MAX_QUESTIONS

    for item_index, (item, count) in enumerate(
        zip(work_items, per_item_counts), start=1
    ):
        if count <= 0:
            continue
        # Default (no user count): stop once we hit the hard ceiling so we
        # don't keep paying for chunks whose output would be tail-trimmed.
        # A user-specified count must visit every selected chunk first so
        # a spread-trim can keep questions from later pages too.
        if desired_count is None and len(all_questions) >= cap:
            break

        if item["kind"] == "vision":
            pages_label = (
                f"notes_vision_pages_{item['page_numbers'][0]}"
                f"-{item['page_numbers'][-1]}"
            )
            try:
                chunk_results = provider.generate_json_from_pdf_images(
                    GENERATION_SYSTEM_PROMPT,
                    build_notes_generation_vision_prompt(count),
                    pdf_path,
                    page_numbers=item["page_numbers"],
                )
            except GeminiDailyQuotaExceededError as error:
                errors.append(
                    {"chunk": pages_label, "message": f"Stopped early: {error}"}
                )
                break
            except Exception as error:
                errors.append({"chunk": pages_label, "message": str(error)})
                continue

            for result in chunk_results:
                if result["error"] or not result["response_text"]:
                    errors.append(
                        {
                            "chunk": pages_label,
                            "message": result["error"] or "empty response",
                        }
                    )
                    continue
                try:
                    payload = extract_json_payload(result["response_text"])
                    chunk_questions = normalize_ai_questions(
                        payload,
                        source=f"{provider.name}_notes_generated_vision_v1",
                    )
                    all_questions.extend(chunk_questions)
                except Exception as error:
                    errors.append({"chunk": pages_label, "message": str(error)})
            continue

        try:
            response_text = provider.generate_json(
                GENERATION_SYSTEM_PROMPT,
                build_notes_generation_prompt(item["chunk"], count),
            )
            payload = extract_json_payload(response_text)
            chunk_questions = normalize_ai_questions(
                payload, source=f"{provider.name}_notes_generated_v1"
            )
            all_questions.extend(chunk_questions)
        except GeminiDailyQuotaExceededError as error:
            errors.append(
                {
                    "chunk": f"text_{item_index}",
                    "message": f"Stopped early: {error}",
                }
            )
            break
        except Exception as error:
            errors.append({"chunk": f"text_{item_index}", "message": str(error)})

    if desired_count is not None:
        all_questions = _spread_keep(all_questions, cap)
    else:
        all_questions = all_questions[:cap]

    for index, question in enumerate(all_questions, start=1):
        question["question_no"] = index
        question["metadata"]["generatedFromNotes"] = True

    summary = {
        "attempted": True,
        "questionsGenerated": len(all_questions),
        "errors": errors,
        "chunksConsidered": len(work_items),
    }
    if desired_count is not None:
        summary["requestedQuestionCount"] = desired_count
    return all_questions, summary


