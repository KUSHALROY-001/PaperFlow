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

Subject-restart handling (JEE Advanced Physics/Chemistry/Mathematics each
restart at Q.1): when both sources report the same paper number but the
bodies are clearly different questions, keep BOTH - the AI one stays on
its number and the regex one is assigned the next free global number,
mirroring _put_extracted_question in provider.py. A naive dict merge by
question_no alone used to drop entire subjects.
"""

import re


def _fingerprint(question):
    text = (question.get("text") or "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text[:160]


def _is_same_question(a, b):
    fp_a = _fingerprint(a)
    fp_b = _fingerprint(b)
    if not fp_a or not fp_b:
        return True
    if fp_a == fp_b:
        return True
    if len(fp_a) >= 24 and fp_a[:80] in fp_b:
        return True
    if len(fp_b) >= 24 and fp_b[:80] in fp_a:
        return True
    return False


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
        merged_by_no[no] = question

    decisions = []

    for question in regex_questions:
        no = question.get("question_no")
        if no is None:
            continue

        if no not in merged_by_no:
            merged_by_no[no] = question
            continue

        existing = merged_by_no[no]
        if _is_same_question(existing, question):
            # AI already has this question - regex never overrides.
            continue

        # Same paper number, different body: keep regex under a free slot.
        new_no = max(merged_by_no.keys()) + 1
        metadata = dict(question.get("metadata") or {})
        metadata["paper_question_no"] = no
        metadata["renumbered_due_to_subject_restart"] = True
        renumbered = {**question, "question_no": new_no, "metadata": metadata}
        merged_by_no[new_no] = renumbered

    for question_no in sorted(merged_by_no):
        q = merged_by_no[question_no]
        source = _source_of(q)
        # Decide reason relative to original paper number / AI presence.
        paper_no = (q.get("metadata") or {}).get("paper_question_no", question_no)
        ai_has_same = any(
            aq.get("question_no") == question_no
            or (aq.get("metadata") or {}).get("paper_question_no") == paper_no
            for aq in ai_questions
            if _is_same_question(aq, q) or aq is q
        )
        # Simpler audit labels:
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

    merged_questions = [merged_by_no[question_no] for question_no in sorted(merged_by_no)]
    return merged_questions, decisions


def _source_of(question):
    metadata = question.get("metadata") or {}
    return metadata.get("parser", "unknown")
