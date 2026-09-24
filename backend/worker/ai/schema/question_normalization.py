"""normalize_ai_questions is the single choke point every AI-generated or
AI-extracted question passes through regardless of which feature produced
it (extraction, notes generation, metadata generation, duplicate
regeneration) - shape validation, field cleanup, diagram-marker
sanitizing, and the small value parsers/regexes it depends on. Split out
of schemas.py - see backend/worker/ARCHITECTURE.md.
"""

import math
import re

from ...placeholders import is_placeholder_question

def normalize_ai_questions(payload, *, source="ai"):
    raw_questions = payload.get("questions", payload) if isinstance(payload, dict) else payload
    if not isinstance(raw_questions, list):
        return []

    normalized = []
    seen_numbers = set()

    for fallback_index, item in enumerate(raw_questions, start=1):
        if not isinstance(item, dict):
            continue

        question_text = str(item.get("text") or item.get("question_text") or "").strip()
        question_type = str(item.get("question_type") or item.get("questionType") or "single").strip()
        if question_type not in {"single", "multi", "fill_blank", "short_answer", "long_answer", "numerical"}:
            question_type = "single"
        options = item.get("options") or []
        if not question_text or not isinstance(options, list):
            continue

        options = [str(option).strip() for option in options if str(option).strip()]
        if question_type in {"single", "multi"} and len(options) < 2:
            continue

        # Drop invented filler before it can occupy a question_no slot.
        # An answer-key-only vision pass used to persist
        # "Reasoning question 21" / ["A","B","C","D"] as real questions
        # (confidence 40, needs_review) and, because vision runs first
        # and fills 1-N with no gaps, skip the text-layer extraction that
        # already had the real stems.
        if question_type in {"single", "multi"} and is_placeholder_question({"text": question_text, "options": options}):
            continue

        try:
            question_no = int(item.get("question_no") or item.get("questionNo") or fallback_index)
        except (TypeError, ValueError):
            question_no = fallback_index

        while question_no in seen_numbers:
            question_no += 1
        seen_numbers.add(question_no)

        correct_indexes = item.get("correct_option_indexes") or item.get("correctOptionIndexes") or []
        if not isinstance(correct_indexes, list):
            correct_indexes = [correct_indexes]

        valid_correct_indexes = []
        for index in correct_indexes:
            try:
                numeric_index = int(index)
            except (TypeError, ValueError):
                continue
            if 0 <= numeric_index < len(options):
                valid_correct_indexes.append(numeric_index)

        if question_type in {"single", "multi"} and not valid_correct_indexes:
            valid_correct_indexes = [0]

        accepted_answers = item.get("accepted_answers") or item.get("acceptedAnswers")
        if question_type == "fill_blank":
            if not isinstance(accepted_answers, list) or not accepted_answers:
                continue
            accepted_answers = [
                [str(answer).strip() for answer in group if str(answer).strip()]
                for group in accepted_answers
                if isinstance(group, list)
            ]
            if not accepted_answers or any(not group for group in accepted_answers):
                continue
        else:
            accepted_answers = None

        grading_rubric = item.get("grading_rubric") or item.get("gradingRubric")
        if question_type in {"short_answer", "long_answer"} and isinstance(grading_rubric, list):
            grading_rubric = [
                {"point": str(entry.get("point") or "").strip(), "weight": parse_optional_number(entry.get("weight")) or 1}
                for entry in grading_rubric
                if isinstance(entry, dict) and str(entry.get("point") or "").strip()
            ] or None
        else:
            grading_rubric = None
        expected_answer = clean_optional_text(item.get("expected_answer") or item.get("expectedAnswer"))
        numeric_answer = parse_optional_number(item.get("numeric_answer") if item.get("numeric_answer") is not None else item.get("numericAnswer"))
        numeric_tolerance = parse_optional_number(item.get("numeric_tolerance") if item.get("numeric_tolerance") is not None else item.get("numericTolerance"))
        if question_type == "numerical" and numeric_answer is None:
            continue

        try:
            confidence = float(item.get("confidence", 70))
        except (TypeError, ValueError):
            confidence = 70
        if 0 < confidence <= 1:
            confidence *= 100

        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        metadata.update(
            {
                "parser": source,
                "aiNeedsReview": bool(item.get("needs_review", True)),
                "aiIssues": item.get("issues", []),
            }
        )

        diagrams = []
        seen_slot_keys = set()
        # Maps whatever the model itself wrote as a diagram's slot_key ->
        # the final, sanitized key actually stored and uploaded under.
        # Populated below whenever _sanitize_slot_key changes anything -
        # even just casing - and used afterward to rewrite every
        # ![[img:...]] marker in this question's own text/options/
        # explanation to match. Without this, a marker survives with the
        # OLD name while diagrams[].slot_key has the NEW one, so the
        # frontend's marker resolution can never find a match for it -
        # the image extracts and uploads to Cloudinary just fine, it's
        # simply never linked back to where it was supposed to appear.
        renamed_slot_keys = {}
        raw_diagrams = item.get("diagrams")
        if isinstance(raw_diagrams, list):
            for diagram_index, raw_diagram in enumerate(raw_diagrams):
                if not isinstance(raw_diagram, dict):
                    continue
                bbox = raw_diagram.get("bbox")
                if not (
                    isinstance(bbox, list)
                    and len(bbox) == 4
                    and all(isinstance(value, (int, float)) for value in bbox)
                ):
                    # Malformed/missing bbox from the model - drop this one
                    # diagram entry rather than carrying a garbage value
                    # through to asset_extractor.crop_diagram, which would
                    # just reject it anyway. The actual geometric validation
                    # (0-1000 range, degenerate-box rejection) happens once,
                    # in asset_extractor.py, right before it's used for
                    # cropping - not duplicated here with a second ruleset
                    # that could drift out of sync with it.
                    continue

                raw_slot_key_value = str(
                    raw_diagram.get("slot_key") or raw_diagram.get("slotKey") or ""
                ).strip()
                slot_key = _sanitize_slot_key(raw_slot_key_value, diagram_index, seen_slot_keys)
                seen_slot_keys.add(slot_key)
                # Catches BOTH cases that need a marker rewrite: an actual
                # rename (invalid chars, over-length, or a duplicate of an
                # earlier diagram in this question, falling back to
                # "diagram-N") and the much more common one - the model
                # used the exact same string in both places, just with a
                # different case or stray whitespace than what
                # _sanitize_slot_key normalized it to (e.g. "Option-C" -
                # a completely natural thing for a model to write despite
                # being told lowercase kebab-case - becomes "option-c").
                if raw_slot_key_value and raw_slot_key_value != slot_key:
                    renamed_slot_keys[raw_slot_key_value] = slot_key
                diagrams.append({"slot_key": slot_key, "bbox": bbox})

        explanation = clean_optional_text(item.get("explanation"))
        if renamed_slot_keys:
            question_text, options, explanation = _rewrite_diagram_markers(
                question_text, options, explanation, renamed_slot_keys
            )

        # Safety net for the model forgetting the ![[img:slot_key]]
        # marker SYSTEM_PROMPT/this schema both require for every entry in
        # "diagrams" now, "default" included (this used to be optional for
        # a single diagram - see migration 041/042, which removed the old
        # fallback rendering that used to cover for a missing marker).
        # Without this, a model that lists a diagram but drops its marker
        # produces an image that's extracted, uploaded, and then silently
        # has nowhere to render - worse than a wrong position, since
        # nothing in the data even hints it's missing. Appending it to the
        # end of the question text is the same fallback position
        # migration 041 used for pre-existing "below_text" rows, and
        # flagging for review surfaces it to a human instead of letting it
        # stay silently lost.
        haystack = question_text + " " + " ".join(options) + " " + (explanation or "")
        missing_marker_slots = [
            diagram["slot_key"]
            for diagram in diagrams
            if f"![[img:{diagram['slot_key']}]]" not in haystack
        ]
        if missing_marker_slots:
            question_text = (
                question_text.rstrip()
                + "\n\n"
                + "\n\n".join(f"![[img:{slot_key}]]" for slot_key in missing_marker_slots)
            )
            metadata["aiNeedsReview"] = True
            metadata["aiIssues"] = list(metadata.get("aiIssues") or []) + [
                f"Diagram slot(s) {', '.join(missing_marker_slots)} had no "
                "![[img:...]] marker in the extracted content - placed at "
                "the end of the question text as a fallback. Move it to "
                "where it actually belongs."
            ]
            confidence = min(confidence, 40)

        # Safety net for a real failure mode seen on a live job: the model
        # correctly extracts a diagram for the question STEM but, for the
        # answer options themselves, sometimes falls back to a bare label
        # like "(A)" with no image marker AND no real text - even though
        # SYSTEM_PROMPT explicitly covers this case (an option that's a
        # picture, not text). That leaves an option with literally no
        # recorded content at all: not broken exactly, just silently
        # empty, indistinguishable in the data from "the model tried and
        # correctly found nothing" unless someone happens to notice a
        # bare "(A)" on the page. Flagging it here means a reviewer sees
        # it in the review queue instead of a student seeing a blank
        # answer choice.
        placeholder_option_indexes = [
            index
            for index, option in enumerate(options)
            if _BARE_OPTION_LABEL_RE.match(option) and "![[img:" not in option
        ]
        if placeholder_option_indexes:
            metadata["aiNeedsReview"] = True
            labels = ", ".join(
                f"option {chr(65 + index)}" for index in placeholder_option_indexes
            )
            metadata["aiIssues"] = list(metadata.get("aiIssues") or []) + [
                f"{labels} looks like a bare answer-choice label with no "
                "text or image - it may be a diagram the AI failed to "
                "detect. Check the source page and attach an image "
                "manually if so."
            ]
            confidence = min(confidence, 40)

        marks_per_correct = parse_optional_number(
            item.get("marks_per_correct")
            if item.get("marks_per_correct") is not None
            else item.get("marksPerCorrect")
        )
        negative_marks_per_wrong = parse_optional_number(
            item.get("negative_marks_per_wrong")
            if item.get("negative_marks_per_wrong") is not None
            else item.get("negativeMarksPerWrong")
        )

        normalized.append(
            {
                "question_no": question_no,
                "topic": clean_optional_text(item.get("topic")),
                "subtopic": clean_optional_text(item.get("subtopic")),
                "passage": clean_optional_text(item.get("passage")),
                "text": question_text,
                "explanation": explanation,
                "options": options,
                "correct_option_indexes": valid_correct_indexes,
                "question_type": question_type,
                "accepted_answers": accepted_answers,
                "grading_rubric": grading_rubric,
                "expected_answer": expected_answer if question_type in {"short_answer", "long_answer"} else None,
                "answer_word_limit": parse_positive_int(item.get("answer_word_limit") or item.get("answerWordLimit")),
                "numeric_answer": numeric_answer if question_type == "numerical" else None,
                "numeric_tolerance": numeric_tolerance if question_type == "numerical" else None,
                "source_page": parse_positive_int(item.get("source_page") or item.get("sourcePage")),
                "confidence": max(0, min(confidence, 100)),
                "metadata": metadata,
                "diagrams": diagrams,
                "marks_per_correct": marks_per_correct,
                "negative_marks_per_wrong": negative_marks_per_wrong,
                "topic_group_index": parse_nonnegative_int(
                    item.get("topic_group_index")
                    if item.get("topic_group_index") is not None
                    else item.get("topicGroupIndex")
                ),
            }
        )

    return normalized


def clean_optional_text(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def parse_optional_number(value):
    """Parse a marks value; return None for missing/invalid (do not coerce to 0)."""
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number):
        return None
    if number < 0:
        return None
    return number


def parse_positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def parse_nonnegative_int(value):
    # Same as parse_positive_int but allows 0 - topic_group_index is a
    # 0-based array position (build_metadata_generation_prompt's "Group N:"
    # labels are 1-based for the prompt text, but the schema/response uses
    # the group's plain 0-based position in the request), so a group index
    # of 0 (the batch's first group) is a completely valid, common value,
    # not a "missing" sentinel the way it would be for source_page.
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value >= 0 else None


_SLOT_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

# Matches ONLY a bare answer-choice label with nothing else - "(A)", "A)",
# "A.", or just "A" - never legitimate real option content (a genuine
# option consisting of just one letter, e.g. a blood-type answer choice,
# would still normally include something else on the page; this is
# deliberately narrow to avoid flagging real short options as broken).
# See normalize_ai_questions' own comment at its call site for what this
# catches and why.
_BARE_OPTION_LABEL_RE = re.compile(r"^\(?[a-zA-Z]\)?\.?$")


def _rewrite_diagram_markers(question_text, options, explanation, renamed_slot_keys):
    """
    Rewrites every ![[img:OLD]] marker in question_text/options/explanation
    to ![[img:NEW]] for each (OLD -> NEW) pair in renamed_slot_keys - see
    the call site's comment in normalize_ai_questions for why this needs
    to exist at all. Markers only ever live in these three fields per
    SYSTEM_PROMPT ("in text, an option, or a markdown-table cell" - a
    table is embedded directly inside "text", not a separate field), so
    there's nowhere else that needs the same treatment.

    A plain string .replace() rather than a regex substitution: slot keys
    are restricted to [a-z0-9-] by construction (either matched
    _SLOT_KEY_RE already, or came from the OLD/raw side where a model
    could in principle have used a regex-special character, which
    .replace() handles safely with no escaping needed either way).

    Known remaining edge case, left unhandled deliberately: if the model
    reuses the literal same slot_key string for two DIFFERENT diagrams in
    one question (a mistake on the model's own part - SYSTEM_PROMPT asks
    for a unique slot_key per diagram), both markers in the text are
    identical strings, so there is no way to tell from the text alone
    which occurrence was meant to become the renamed "diagram-N" and
    which should keep the original name - this rewrites every occurrence
    the same way. That's a real ambiguity in the model's own output, not
    something recoverable here; it's also far rarer in practice than the
    casing/whitespace mismatch this function primarily exists to fix.
    """
    marker_replacements = [
        (f"![[img:{raw_key}]]", f"![[img:{sanitized_key}]]")
        for raw_key, sanitized_key in renamed_slot_keys.items()
    ]

    def rewrite(value):
        if not value:
            return value
        for old_marker, new_marker in marker_replacements:
            value = value.replace(old_marker, new_marker)
        return value

    return (
        rewrite(question_text),
        [rewrite(option) for option in options],
        rewrite(explanation),
    )


def _sanitize_slot_key(raw_slot_key, diagram_index, seen_slot_keys):
    """
    Guarantees a well-formed, unique-within-this-question slot key,
    matching migration 038's own DB-level CHECK constraint on
    question_assets.slot_key exactly (^[a-z0-9][a-z0-9-]{0,63}$) - a
    schema `pattern` hint is a request to the model, not an enforced
    guarantee (see this file's own dialect-handling comments), so this is
    the actual safety net that keeps a malformed or model-invented
    duplicate slot_key from ever reaching an INSERT and failing the
    question_assets_slot_key_unique_per_question constraint.

    Falls back to a plain "diagram-N" (N = this diagram's 0-based position
    in the model's own diagrams array) when the model's slot_key is
    missing, malformed, or a duplicate of one already used earlier in this
    same question - never drops the diagram entirely just because its
    label needs fixing.
    """
    candidate = str(raw_slot_key or "").strip().lower().replace("_", "-")
    if not _SLOT_KEY_RE.match(candidate) or candidate in seen_slot_keys:
        candidate = f"diagram-{diagram_index}"
        # The fallback itself could theoretically collide too (e.g. the
        # model already used the literal string "diagram-0" as its own
        # slot_key for an earlier entry) - keep appending until it's
        # actually free rather than assuming one fallback attempt is
        # always enough.
        suffix = 1
        while candidate in seen_slot_keys:
            candidate = f"diagram-{diagram_index}-{suffix}"
            suffix += 1
    return candidate
