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
"""


def reconcile_questions(regex_questions, ai_questions):
    """
    Merge two question lists keyed by question_no, with AI taking
    unconditional priority.

    Returns (merged_questions, decisions):
      merged_questions - list of question dicts, one per distinct
        question_no found by either source, sorted by question_no.
      decisions - list of {"question_no", "source", "reason"} dicts, one per
        merged question, meant to be attached to the job's output_summary
        as an audit trail (this is what let us diagnose the last two
        incidents from a SQL query instead of guessing - keep doing that
        here).
    """
    regex_by_no = {question["question_no"]: question for question in regex_questions}
    ai_by_no = {question["question_no"]: question for question in ai_questions}

    merged_by_no = dict(regex_by_no)
    merged_by_no.update(ai_by_no)  # AI always wins/fills on top, unconditionally

    decisions = []
    for question_no in sorted(merged_by_no):
        if question_no in ai_by_no:
            reason = "ai_found_it" if question_no in regex_by_no else "only_ai_found_it"
            source = _source_of(ai_by_no[question_no])
        else:
            reason = "only_regex_found_it_ai_never_touched_this_question"
            source = _source_of(regex_by_no[question_no])
        decisions.append({"question_no": question_no, "source": source, "reason": reason})

    merged_questions = [merged_by_no[question_no] for question_no in sorted(merged_by_no)]
    return merged_questions, decisions


def _source_of(question):
    metadata = question.get("metadata") or {}
    return metadata.get("parser", "unknown")