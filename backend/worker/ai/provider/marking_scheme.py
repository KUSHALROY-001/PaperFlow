"""Applies a mock test's per-section marking scheme (marks per correct
answer, negative marking) to extracted/generated questions, and the
question-type classification it depends on. Split out of provider.py -
see backend/worker/ARCHITECTURE.md.
"""

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
# the question dict here, which worker.py -> db_questions.py#replace_questions then
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
def _build_section_ranges(sections):
    """Cumulative [start, end] question-number range per section, computed
    purely from each section's own declared questionCount and its position
    in the ordered sections list - NOT from anything the AI classified.

    This exists because pure topic-name matching (the "section" tier
    below) depends on the AI reproducing a section name exactly, on every
    single question, for the entire paper - and in practice that drifts
    for a subset of questions on longer papers. Observed directly on a
    real JECA paper: a 100-question extraction split across several
    page-image API calls (see chunk_pages/generate_json_from_pdf_images)
    correctly classified questions 81-85 into the 2/0 multi-select
    section, then classification quietly drifted back to the 1/0.25
    section's topic name for 86-100 - same section, same call pattern,
    just model variance near the tail of a long extraction. Topic-name
    matching has zero tolerance for that: one differently-worded "topic"
    silently loses that question's correct marking with no signal
    anywhere that anything went wrong. A numeric range has no such failure
    mode - it depends only on the section's own configured question count
    and the question's own question_no, neither of which the AI's per-
    question classification can drift on independently of the other.
    """
    ranges = []
    cursor = 1
    for section in sections:
        name = section.get("name")
        count = section.get("questionCount")
        if not name or not isinstance(count, (int, float)) or count <= 0:
            continue
        count = int(count)
        start = cursor
        end = cursor + count - 1
        ranges.append((start, end, name.strip().lower()))
        cursor = end + 1
    return ranges


def _section_name_for_question_no(section_ranges, question_no):
    if question_no is None:
        return None
    for start, end, name in section_ranges:
        if start <= question_no <= end:
            return name
    return None


def _apply_section_marks(template_context, questions):
    """Assign per-question marks from template settings / sections.

    Priority per question, filling only whatever fields are still missing
    at each step (a question with marks_per_correct from the AI but no
    negative_marks_per_wrong still gets the second field resolved from
    the next tier down - it does not stay half-filled just because the
    first field already had a value):
      1. Marks the AI already set (from paper instructions / scheme prompt)
      2. Section-level marksPerCorrect / negativeMarksPerWrong. The
         question's section is found primarily by its question_no falling
         inside that section's numeric range (see _build_section_ranges) -
         deterministic, independent of anything the AI classified. Only
         when no configured range covers this question_no at all (a
         section with no questionCount set, or a question_no the ranges
         don't add up to cover) does this fall back to matching the AI's
         own "topic" text against a section name, case-insensitively.
      3. markingScheme.by_question_type, matched by question_type - see
         _classify_question_type below for why this only ever
         distinguishes "single" vs "multi" in this app, never a richer
         label like "Numerical Value Answer"
      4. Template / mock-test defaults when they are useful (> 0). Zero
         defaults mean "varies" (e.g. JEE Advanced seed) and are skipped.

    Every question ends this function with EITHER both fields set from a
    single coherent source, or both left as the AI/editor left them - never
    marks_per_correct from one tier and negative_marks_per_wrong from a
    different, lower-priority one, because attempts.service.js's scoring
    query does its own null-fallback to mock_tests defaults PER FIELD, and
    a half-filled pair would silently borrow the wrong field from the
    paper's overall default instead of from whatever tier actually knew
    about this question.
    """
    empty_stats = {
        "sectionsWithOverrides": 0,
        "typesWithOverrides": 0,
        "questionsMatched": 0,
        "defaultsApplied": 0,
        "aiMarksKept": 0,
        "unmappedQuestionTypes": [],
        "sectionMatchedByRange": 0,
        "sectionMatchedByTopicFallback": 0,
    }
    if not template_context:
        return empty_stats

    sections = template_context.get("sections") or []
    marking_scheme = template_context.get("markingScheme") or {}
    by_type_raw = (
        marking_scheme.get("by_question_type")
        or marking_scheme.get("byQuestionType")
        or {}
    )

    overrides_by_name = {}
    for section in sections:
        name = section.get("name")
        if not name:
            continue
        marks = section.get("marksPerCorrect")
        negative = section.get("negativeMarksPerWrong")
        if marks is None and negative is None:
            continue
        overrides_by_name[name.strip().lower()] = {
            "marks_per_correct": marks,
            "negative_marks_per_wrong": negative,
        }

    # Primary section-lookup path - see _build_section_ranges above for why
    # this takes priority over matching the AI's own "topic" text.
    section_ranges = _build_section_ranges(sections)
    ranges_matched = 0
    topic_fallback_matched = 0

    # question_type in this app's schema (see migration 001) is a Postgres
    # ENUM with exactly two values, 'single' and 'multi', derived from how
    # many correct_option_indexes a question has - there is no way to
    # store "Numerical Value Answer" or "Matching List" as an actual type,
    # however a template's marking_scheme.by_question_type is worded. So
    # a by_question_type key only ever does something here if it can be
    # classified as single- or multi-correct by substring match; anything
    # else (numerical, matching-list, etc.) is reported in
    # unmappedQuestionTypes rather than silently doing nothing forever -
    # that config genuinely can't be applied post-hoc without the app
    # supporting non-MCQ answer types, and the publisher should be told
    # that rather than assume it's working.
    by_type = {}
    unmapped_type_keys = []
    if isinstance(by_type_raw, dict):
        for raw_key, scores in by_type_raw.items():
            if not isinstance(scores, dict):
                continue
            canonical = _classify_question_type_label(raw_key)
            if canonical is None:
                unmapped_type_keys.append(raw_key)
                continue
            plus = scores.get("marksPerCorrect", scores.get("marks_per_correct"))
            minus = scores.get(
                "negativeMarksPerWrong", scores.get("negative_marks_per_wrong")
            )
            if plus is None and minus is None:
                continue
            # First matching raw key for a canonical type wins - don't
            # let a second, differently-worded key for the same type
            # (e.g. both "Single Correct" and "Single Correct Option")
            # silently overwrite the first.
            by_type.setdefault(
                canonical,
                {"marks_per_correct": plus, "negative_marks_per_wrong": minus},
            )

    default_marks = template_context.get("marksPerCorrect")
    default_negative = template_context.get("negativeMarksPerWrong")
    has_useful_defaults = (
        default_marks is not None and float(default_marks) > 0
    ) or (default_negative is not None and float(default_negative) > 0)

    matched = 0
    defaults_applied = 0
    ai_kept = 0

    for question in questions:
        had_marks = question.get("marks_per_correct") is not None
        had_negative = question.get("negative_marks_per_wrong") is not None
        had_any_ai_marks = had_marks or had_negative
        had_both_ai_marks = had_marks and had_negative
        if had_any_ai_marks:
            ai_kept += 1
        if had_both_ai_marks:
            # Nothing left to fill - AI (or the editor) already gave a
            # complete, coherent pair for this question, and that's the
            # top-priority source by design (it's the one that actually
            # read the paper's own printed instructions for this specific
            # question, which any template-level config is only a hint
            # towards).
            continue

        range_name = _section_name_for_question_no(
            section_ranges, question.get("question_no")
        )
        if range_name is not None:
            section_override = overrides_by_name.get(range_name)
            if section_override is not None:
                ranges_matched += 1
        else:
            section_override = None

        if section_override is None:
            # No configured range covers this question_no at all (a
            # section with no questionCount, or a paper whose numbering
            # doesn't follow the sections in strict sequential order) -
            # fall back to the AI's own topic classification rather than
            # leaving this question with no section match whatsoever.
            topic_key = (question.get("topic") or "").strip().lower()
            section_override = overrides_by_name.get(topic_key)
            if section_override is not None:
                topic_fallback_matched += 1

        qtype = question.get("question_type")
        type_override = by_type.get(qtype) if qtype else None

        resolved_marks = None
        resolved_negative = None
        resolved_from = None
        for tier_name, tier in (
            ("section", section_override),
            ("type", type_override),
            (
                "default",
                {
                    "marks_per_correct": default_marks,
                    "negative_marks_per_wrong": default_negative,
                }
                if has_useful_defaults
                else None,
            ),
        ):
            if not tier:
                continue
            if resolved_marks is None and tier.get("marks_per_correct") is not None:
                resolved_marks = tier["marks_per_correct"]
                resolved_from = resolved_from or tier_name
            if (
                resolved_negative is None
                and tier.get("negative_marks_per_wrong") is not None
            ):
                resolved_negative = tier["negative_marks_per_wrong"]
                resolved_from = resolved_from or tier_name
            if resolved_marks is not None and resolved_negative is not None:
                break

        filled_something = False
        if not had_marks and resolved_marks is not None:
            question["marks_per_correct"] = resolved_marks
            filled_something = True
        if not had_negative and resolved_negative is not None:
            question["negative_marks_per_wrong"] = resolved_negative
            filled_something = True

        if not filled_something:
            continue
        if resolved_from == "default":
            defaults_applied += 1
        elif not had_any_ai_marks:
            # Only count as a template "match" when nothing came from the
            # AI at all - a question that had one AI field and got the
            # other filled from a section/type override was already
            # counted in ai_kept above, and double-counting it here would
            # make questionsMatched and aiMarksKept overlap.
            matched += 1

    return {
        "sectionsWithOverrides": len(overrides_by_name),
        "typesWithOverrides": len(by_type),
        "questionsMatched": matched,
        "defaultsApplied": defaults_applied,
        "aiMarksKept": ai_kept,
        "unmappedQuestionTypes": sorted(set(unmapped_type_keys)),
        # Visibility into which lookup path actually resolved each
        # question's section, so a paper where the AI's topic classification
        # is drifting (the failure mode _build_section_ranges exists to
        # route around) shows up in the job summary instead of only as a
        # user-visible wrong mark with no diagnostic trail.
        "sectionMatchedByRange": ranges_matched,
        "sectionMatchedByTopicFallback": topic_fallback_matched,
    }


def _classify_question_type_label(label):
    """Maps a free-text marking-scheme key to this app's 'single'/'multi'
    question_type ENUM (see migration 001) by substring match - templates
    are written by publishers in their own words ("Multiple Correct
    Options", "MCQ (multi)", "Single Correct"), not the internal enum
    value, so an exact-match lookup would silently match nothing. Returns
    None when the label can't be mapped to either (e.g. "Numerical Value
    Answer", "Matching List" - types this app's MCQ-only schema has no
    way to store at all).
    """
    if not isinstance(label, str):
        return None
    normalized = label.strip().lower()
    if "multi" in normalized:
        return "multi"
    if "single" in normalized:
        return "single"
    return None


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
def prepare_questions_for_persistence(questions, template_context=None):
    """Apply deterministic fields required before an incremental DB write."""
    for question in questions:
        if question.get("question_type"):
            continue
        correct_option_indexes = question.get("correct_option_indexes") or []
        question["question_type"] = (
            "multi" if len(correct_option_indexes) > 1 else "single"
        )
    return _apply_section_marks(template_context, questions)


