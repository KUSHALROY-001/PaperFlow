"""
Combines the regex parser's output with the AI extractor's output for a
single document.

This used to score each source per-question (via question_parser's
confidence_for heuristic) and let the higher score win on contested
question numbers. That was retired after a real exam PDF showed the
failure mode plainly: OCR had split several question numbers off from
their bodies, so the regex parser produced a handful of badly-merged
blocks that still scored a *confident* 95% (long text, 4+ options found,
a plausible-looking answer) - "confident" isn't the same as "correct", and
those corrupted blocks were winning the score comparison against AI
answers that were actually right.

The replacement is simpler and matches how the pipeline is meant to be
trusted now that vision-first extraction and per-chunk resilience exist
(see gemini_provider.py#generate_json_from_pdf_images): AI wins
unconditionally wherever it produced an answer for a given question_no -
no scoring, no contest. Regex only ever contributes a question_no that AI
never touched at all (e.g. because the one chunk covering that page failed
and there was nothing to compare against). Regex can never override or
outscore an AI answer, even a low-confidence one.

Exception: invented placeholder stems ("Reasoning question 21" with
options A/B/C/D) are not real AI extractions. Those used to beat the
regex body because AI-priority is unconditional. They now lose to regex
on the same paper number, and are dropped if regex has nothing either.

Same number, different body: AI wins and the regex copy is dropped (and
recorded in the decisions list as regex_dropped_ai_owns_this_number).
This used to keep BOTH, with the regex one moved to the next free global
number, on the theory that it was a subject restart (JEE Advanced
Physics/Chemistry/Mathematics each restart at Q.1). That no longer holds:
the AI side renumbers restarts itself (_put_extracted_question in
provider.py) and so does question_parser.py, so both sources already share
one global numbering. Keeping the regex copy only ever added garbled
fragments - it turned a real 51-question paper into 54.
"""

from .placeholders import is_placeholder_question
# is_same_extracted_question replaces this module's own, much cruder
# fingerprint match (lowercase + collapse whitespace only - no NFKC
# normalization, no LaTeX noise stripping). Regex extracts raw PDF text
# and AI produces clean LaTeX for the same printed question, so the old
# comparison here routinely judged genuinely-identical questions
# "different" and kept the regex copy as a fake subject-restart duplicate
# - visible as both an inflated question count AND a badly-formatted
# extra copy (regex output never gets marks/subtopic applied, unlike the
# AI-covered path) sitting right next to a perfectly good AI version of
# the same question. See text_similarity.py for the full history.
from .text_similarity import is_same_extracted_question as _is_same_question


def reconcile_questions(regex_questions, ai_questions):
    """
    Merge two question lists keyed by question_no, with AI taking
    unconditional priority when the body is the same question. Different
    bodies under the same paper number are kept as separate questions
    (subject restart).

    Returns (merged_questions, decisions):
      merged_questions - list of question dicts, one per distinct
        question kept after merge, sorted by question_no.
      decisions - list of {"question_no", "source", "reason"} dicts, one per
        merged question, meant to be attached to the job's output_summary
        as an audit trail.
    """
    merged_by_no = {}
    for question in ai_questions:
        no = question.get("question_no")
        if no is None:
            continue
        if is_placeholder_question(question):
            continue
        merged_by_no[no] = question

    decisions = []
    dropped_regex = []

    for question in regex_questions:
        no = question.get("question_no")
        if no is None:
            continue

        if no not in merged_by_no:
            merged_by_no[no] = question
            continue

        existing = merged_by_no[no]
        if is_placeholder_question(existing):
            merged_by_no[no] = question
            continue
        if _is_same_question(existing, question):
            # AI already has this question - regex never overrides.
            continue

        # Same number, different body. Both extractors number in the same
        # global space by this point (the AI side renumbers subject
        # restarts in _put_extracted_question, and question_parser.py does
        # the same for regex), so a collision means one of the two is
        # wrong - and per the rule at the top of this file, AI wins.
        # Keeping the regex copy "alongside" as a fake subject restart was
        # what turned a real 51-question JEE paper into 54: its regex pass
        # only finds 3 questions at all, all garbled (option text mixed
        # with a "[PAGE 2]" marker, numbered 1/3/2), and each was kept as
        # an extra question next to the good AI version. Regex still
        # contributes any number the AI never produced (handled above).
        dropped_regex.append(
            {
                "question_no": no,
                "source": _source_of(question),
                "reason": "regex_dropped_ai_owns_this_number",
            }
        )

    for question_no in sorted(merged_by_no):
        q = merged_by_no[question_no]
        source = _source_of(q)
        # Decide reason relative to original paper number / AI presence.
        paper_no = (q.get("metadata") or {}).get("paper_question_no", question_no)
        parser = (q.get("metadata") or {}).get("parser", "")
        if "ai" in str(parser).lower() or "gemini" in str(parser).lower() or "openai" in str(parser).lower():
            # AI-sourced
            regex_had = any(
                rq.get("question_no") == paper_no and _is_same_question(rq, q)
                for rq in regex_questions
            )
            reason = "ai_found_it" if regex_had else "only_ai_found_it"
        elif (q.get("metadata") or {}).get("renumbered_due_to_subject_restart"):
            reason = "regex_subject_restart_kept_alongside_ai"
        else:
            reason = "only_regex_found_it_ai_never_touched_this_question"
        decisions.append(
            {"question_no": question_no, "source": source, "reason": reason}
        )

    decisions.extend(dropped_regex)
    merged_questions = [merged_by_no[question_no] for question_no in sorted(merged_by_no)]
    return merged_questions, decisions


def _source_of(question):
    metadata = question.get("metadata") or {}
    return metadata.get("parser", "unknown")
