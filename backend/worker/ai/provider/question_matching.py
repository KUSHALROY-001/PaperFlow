"""Dedup/matching helpers used while reconciling AI-extracted questions
against the regex-extracted question list during the main extraction
pass. Split out of provider.py - see backend/worker/ARCHITECTURE.md.
"""

import difflib
import re
import unicodedata

from ...placeholders import is_placeholder_question

def _question_text_fingerprint(question):
    """
    Normalized prefix of the question body used to decide whether two
    extractions with the SAME paper question_no are the same question (e.g.
    overlapping vision chunks of one subject, or the SAME question
    re-transcribed by a different extraction backend) or genuinely
    different ones (e.g. JEE Advanced Physics Q.1 vs Chemistry Q.1 vs
    Mathematics Q.1 - each subject restarts numbering at 1).

    NFKC-normalized before comparison, not just lowercased/whitespace-
    collapsed - this matters specifically because the two backends that
    can produce competing results for the same question
    (generate_json_from_pdf_images, reading rendered page images, vs
    generate_json_from_pdf, the last-resort call that hands Gemini the
    raw PDF bytes to read natively) transcribe math notation differently
    even when they agree on the actual question text. Unicode's
    Mathematical Alphanumeric Symbols block (the math-italic 𝑎, 𝑏, ℝ, etc.
    that fill a real JEE Advanced PDF) has compatibility decompositions to
    plain ASCII letters for exactly this kind of case - NFKC collapses
    "𝑎𝑖" and "ai" (or "ℝ" and "R") to the same string, so two transcriptions
    of the identical question fingerprint the same instead of silently
    failing the comparison below and being misread as a subject-boundary
    restart (see the real incident this caused: a JEE paper's true 48
    questions came back as 69, because ~23 re-transcriptions from the
    whole-PDF fallback didn't fingerprint-match their already-found
    counterpart from the page-image vision pass and got renumbered as new
    questions instead of recognized as duplicates).
    """
    text = (question.get("text") or "")
    text = unicodedata.normalize("NFKC", text)
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text[:200]


def _is_same_extracted_question(existing, new):
    """
    True when two results with the same paper number are almost certainly
    the same physical question (chunk overlap / fuller re-extraction, or a
    re-transcription of the same question through a different extraction
    backend), not a subject-boundary restart.
    """
    fp_a = _question_text_fingerprint(existing)
    fp_b = _question_text_fingerprint(new)
    if not fp_a or not fp_b:
        # No body to compare - treat as same number collision that should
        # follow prefer_new, not as a guaranteed subject restart (empty
        # bodies are more often parse failures than new subjects).
        return True
    if fp_a == fp_b:
        return True
    # Partial page-split: one extraction has a stub, the other the rest.
    # Threshold is intentionally low (~24 chars) so short stems still match
    # a fuller re-extraction of the same question across chunk boundaries.
    if len(fp_a) >= 24 and fp_a[:80] in fp_b:
        return True
    if len(fp_b) >= 24 and fp_b[:80] in fp_a:
        return True
    # Exact/substring matching catches near-identical transcriptions, but
    # NFKC normalization alone doesn't close the whole gap between
    # extraction backends - generate_json_from_pdf and
    # generate_json_from_pdf_images can still transcribe fractions,
    # spacing around operators, or a leading "Q.1" label differently for
    # the SAME question. Fall back to overall similarity rather than
    # treating any remaining difference as proof of a subject restart.
    # A genuine subject restart (Math Q.1 vs Physics Q.1 vs Chemistry Q.1)
    # shares at most a short boilerplate opener ("let r denote the set of
    # all real numbers." - several questions in a real JEE Advanced paper
    # open with exactly that) before diverging completely, which scores
    # well under this threshold; a re-transcription of the SAME question
    # scores well above it even with formatting noise spread throughout.
    similarity = difflib.SequenceMatcher(None, fp_a, fp_b).ratio()
    return similarity >= 0.72


def _put_extracted_question(questions_by_no, question, *, prefer_new):
    """
    Insert one extracted question into the question_no-keyed pool.

    Same paper number + same/similar body  -> keep one (prefer_new decides
    which). Same paper number + DIFFERENT body -> subject restart (JEE
    Advanced Physics/Chemistry/Mathematics each use Q.1..Q.N independently);
    assign the next free global number and remember the paper-local number
    in metadata so nothing is silently overwritten.

    This is the fix for the incident where Mathematics was extracted, then
    Chemistry's Q.1-17 overwrote those keys, and gap-fill padded 18-51 so
    the job reported 51 questions with Math content gone and Chemistry
    duplicated.
    """
    if not question:
        return
    if is_placeholder_question(question):
        return
    no = question.get("question_no")
    if no is None:
        return

    if no not in questions_by_no:
        questions_by_no[no] = question
        return

    existing = questions_by_no[no]
    if _is_same_extracted_question(existing, question):
        if prefer_new:
            questions_by_no[no] = question
        return

    # Different question, same paper number - namespace into a free slot.
    new_no = max(questions_by_no.keys()) + 1
    metadata = dict(question.get("metadata") or {})
    metadata["paper_question_no"] = no
    metadata["renumbered_due_to_subject_restart"] = True
    questions_by_no[new_no] = {
        **question,
        "question_no": new_no,
        "metadata": metadata,
    }


def _missing_question_numbers(questions_by_no, regex_questions, expected_count=None):
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
    # expected_count (template_context.expectedQuestionCount, when a
    # template is applied) extends the search range even when what's been
    # found so far has NO internal gaps - without this, a gapless-but-short
    # result (e.g. questions 1-16 found with zero holes, because whatever
    # chunk covered 17+ came back empty) reads as "nothing missing" and
    # every fallback pass below gets skipped, permanently truncating the
    # document at 16 instead of retrying the pages that never got covered.
    # This one incident is exactly what happened on a real JEE Advanced
    # extraction: a single vision chunk returned an empty response, the
    # chunks before it happened to be gapless, and the whole rest of the
    # document (17-54) was silently never attempted.
    expected_max = max(known_numbers | ({expected_count} if expected_count else set()))
    return set(range(1, expected_max + 1)) - set(questions_by_no)


