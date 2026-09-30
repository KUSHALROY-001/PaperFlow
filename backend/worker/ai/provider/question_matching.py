"""Dedup/matching helpers used while reconciling AI-extracted questions
against the regex-extracted question list during the main extraction
pass. Split out of provider.py - see backend/worker/ARCHITECTURE.md.
"""

from ...placeholders import is_placeholder_question
from ...text_similarity import is_same_extracted_question


def _put_extracted_question(
    questions_by_no, question, *, prefer_new, allow_new_subject_slot=True
):
    """
    Insert one extracted question into the question_no-keyed pool.

    Same paper number + same/similar body  -> keep one (prefer_new decides
    which). Same paper number + DIFFERENT body -> subject restart (JEE
    Advanced Physics/Chemistry/Mathematics each use Q.1..Q.N independently);
    assign the next free global number and remember the paper-local number
    in metadata so nothing is silently overwritten. This is the fix for the
    incident where Mathematics was extracted, then Chemistry's Q.1-17
    overwrote those keys, and gap-fill padded 18-51 so the job reported 51
    questions with Math content gone and Chemistry duplicated.

    allow_new_subject_slot=False disables that "different body -> new
    slot" branch: a mismatch is simply skipped instead of duplicated. Pass
    this from any call site that is re-covering ground an EARLIER pass in
    the same run may have already extracted (the vision-fallback and
    whole-PDF last-resort passes in provider.py, both of which can
    re-transcribe pages/subjects the vision-first or text-chunk pass
    already got) - NOT from a call site that is the first and only attempt
    at a given page's content (vision-first, text-chunk), where a mismatch
    really can be a genuine subject restart.

    This exists because of a second incident distinct from the one above:
    the SAME already-correctly-extracted question, re-transcribed by a
    later fallback pass through a different extraction method (raw PDF
    bytes vs rendered page images), doesn't always fingerprint-match its
    earlier counterpart closely enough (is_same_extracted_question is a
    similarity threshold, not a guarantee - LLM output isn't perfectly
    deterministic between calls, so how close two transcriptions of the
    identical text land varies run to run). Before this flag existed, a
    near-miss there was indistinguishable from a real subject restart and
    got duplicated into a new slot - non-deterministically, since it
    depended on how much that run's transcription happened to drift. A
    real JEE Advanced paper with exactly 51 questions came back as 63, 73,
    and 79 across separate reprocessing runs of the identical PDF, purely
    from this. Skipping the mismatch here instead of duplicating it does
    mean a genuine subject restart that ONLY a later fallback pass
    happens to catch - one that both the first pass AND regex missed
    entirely - is dropped rather than kept; that combination is far rarer
    than the duplication it prevents.
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
    if is_same_extracted_question(existing, question):
        if prefer_new:
            questions_by_no[no] = question
        return

    if not allow_new_subject_slot:
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


