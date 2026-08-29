import json
import re


def _question_item_schema(*, nullable_as_union):
    # Gemini's responseSchema is a subset of OpenAPI 3.0: optional fields are
    # marked with a separate "nullable": true flag, and it doesn't support
    # multi-type "type" arrays. OpenAI's structured outputs use standard
    # JSON Schema instead, where a nullable field is expressed as
    # "type": [<type>, "null"]. Getting this dialect wrong for a given
    # provider doesn't crash anything - the provider just won't be able to
    # enforce the schema and normalize_ai_questions()/extract_json_payload()
    # remain as the safety net - but it's worth re-checking against each
    # provider's current docs if either changes their schema dialect.
    def optional(json_type):
        if nullable_as_union:
            return {"type": [json_type, "null"]}
        return {"type": json_type, "nullable": True}

    def optional_array(item_type, **extra):
        if nullable_as_union:
            return {"type": ["array", "null"], "items": {"type": item_type}, **extra}
        return {"type": "array", "items": {"type": item_type}, "nullable": True, **extra}

    properties = {
        "question_no": {"type": "integer"},
        "topic": optional("string"),
        "subtopic": optional("string"),
        "passage": optional("string"),
        "text": {"type": "string"},
        "explanation": optional("string"),
        "options": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
        },
        "correct_option_indexes": {
            "type": "array",
            "items": {"type": "integer"},
        },
        "source_page": optional("integer"),
        "confidence": {"type": "integer"},
        "needs_review": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
        "diagrams": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    # A short, stable identifier for THIS specific diagram
                    # within THIS question - lowercase letters, digits, and
                    # hyphens only (matches migration 038's own DB-level
                    # CHECK constraint on question_assets.slot_key exactly,
                    # so a well-formed slot_key here never gets rejected at
                    # insert time). Referenced by a ![[img:slot_key]] marker
                    # embedded directly in text/options/a table cell - see
                    # this field's own description below for when a marker
                    # is required vs. not.
                    "slot_key": {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]{0,63}$"},
                    # Same [ymin, xmin, ymax, xmax] 0-1000 convention the
                    # single-diagram version of this schema always used -
                    # see normalized_bbox_to_pixels in asset_extractor.py.
                    "bbox": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "minItems": 4,
                        "maxItems": 4,
                    },
                },
                "required": ["slot_key", "bbox"],
                **({"additionalProperties": False} if nullable_as_union else {}),
            },
            "description": (
                "Every distinct diagram, circuit, graph, chart, or figure "
                "VISUALLY PRESENT on the page image for this question - not "
                "just because the question text mentions 'figure', 'shown "
                "below', 'as shown', or similar wording. Usually empty (most "
                "questions have no diagram) or has exactly one entry. A "
                "question can have MORE than one - e.g. a List-I/List-II "
                "matching question where each list item is itself an image, "
                "or a long question with a diagram in the stem AND another "
                "in one of the options. Give each entry its own distinct "
                "slot_key.\n\n"
                "If there is exactly ONE diagram for this question, set its "
                "slot_key to \"default\" and do NOT add any "
                "![[img:default]] marker anywhere - it renders "
                "automatically without one, same as it always has.\n\n"
                "If there is MORE than one diagram, give each a distinct, "
                "descriptive slot_key (e.g. \"list-i-1\", \"list-i-2\", "
                "\"option-c\") and embed a matching ![[img:slot_key]] "
                "marker - that literal syntax, brackets included - at the "
                "EXACT point in \"text\", an \"options\" entry, or inside a "
                "markdown table cell where that specific image belongs. "
                "Every non-\"default\" slot_key you list here MUST have a "
                "corresponding marker somewhere in the question's own "
                "content, or that image has nowhere to render."
            ),
        },
        # Only meaningful for generate_questions_from_metadata's multi-group
        # batched requests (see provider.py#build_metadata_generation_prompt)
        # - a single request there can ask for several DIFFERENT topic/
        # subtopic/marks combinations at once (to cut down request count
        # against Gemini's free-tier RPD cap), so this is how the response
        # says which of the numbered "Group N:" blocks in the prompt each
        # question was written for. The caller then force-assigns that
        # group's own trusted topic/subtopic/marks - this field only ever
        # has to identify WHICH group, never what that group's values are,
        # same "don't trust the model's own classification" stance already
        # used for topic/subtopic elsewhere in this schema. Left null/absent
        # by every other caller (PDF extraction, single-group generation),
        # which never mention it in their prompts.
        "topic_group_index": {
            **optional("integer"),
            "description": (
                "Only used when the prompt lists multiple numbered "
                "'Group N:' blocks - set this to that N for every question. "
                "Leave null when the prompt describes just one, unnumbered "
                "request."
            ),
        },
    }

    schema = {
        "type": "object",
        "properties": properties,
        "required": [
            "question_no",
            "text",
            "options",
            "correct_option_indexes",
            "diagrams",
        ],
    }

    if nullable_as_union:
        # OpenAI's strict structured-output mode requires every declared
        # property to also be listed in "required" (optionality is
        # expressed purely through the "null" type union above, not through
        # actually omitting the key) and disallows undeclared properties.
        schema["required"] = list(properties.keys())
        schema["additionalProperties"] = False

    return schema


def _question_response_schema(*, nullable_as_union):
    schema = {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": _question_item_schema(nullable_as_union=nullable_as_union),
            }
        },
        "required": ["questions"],
    }
    if nullable_as_union:
        schema["additionalProperties"] = False
    return schema


# Gemini responseSchema dialect (OpenAPI 3.0 subset).
GEMINI_QUESTION_RESPONSE_SCHEMA = _question_response_schema(nullable_as_union=False)

# OpenAI structured-outputs dialect (standard JSON Schema, strict mode).
OPENAI_QUESTION_RESPONSE_SCHEMA = _question_response_schema(nullable_as_union=True)


# Historical note: this used to be a module-level JSON_BLOCK_RE constant
# with an unanchored re.search() applied unconditionally before any parse
# attempt - see extract_json_payload()'s comment for why that was buggy.
# The anchored, try-parse-first version now lives inline in that function.


def _find_balanced_objects(text):
    """
    Scans text for every balanced {...} substring, at any nesting depth -
    not just ones that return all the way to depth 0. This matters because
    in a truncated response the OUTER wrapper (`{"questions": [...`) never
    closes, so gating on "back to depth 0" would mean the individual
    question objects nested inside it - which DO close correctly - never
    get recorded either. Correctly skips over braces that appear inside
    quoted strings.
    """
    objects = []
    open_positions = []
    in_string = False
    escape = False

    for index, char in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char == "{":
            open_positions.append(index)
        elif char == "}":
            if open_positions:
                start = open_positions.pop()
                objects.append(text[start : index + 1])

    return objects


def salvage_question_objects(text):
    """
    Last-resort recovery for a response that broke partway through (e.g. an
    "Unterminated string" error from the model cutting off mid-generation).
    Rather than discarding the WHOLE chunk's worth of questions because one
    object near the end never finished, this pulls out every individually
    well-formed {...} object in the text and keeps whichever ones parse and
    look like a question (has "options" and either "text" or
    "question_text") - so a response that correctly wrote out 8 questions
    before breaking on the 9th still contributes those 8, instead of
    contributing nothing (which is what silently erased 37 real questions
    from a 100-question exam before this existed).
    """
    salvaged = []
    for candidate in _find_balanced_objects(text):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and "options" in parsed and (
            "text" in parsed or "question_text" in parsed
        ):
            salvaged.append(parsed)
    return salvaged


def extract_json_payload(text):
    if not text:
        raise ValueError("AI response was empty")

    original_text = text
    stripped = text.strip()

    # Try a direct parse FIRST. This is actually the common/expected case
    # here - Gemini's responseMimeType="application/json" mode returns
    # bare JSON with no markdown wrapper at all - so this succeeds most
    # of the time and skips the fence-stripping step entirely.
    #
    # Trying this first (rather than unconditionally stripping fences
    # before ever attempting a parse, which is what this function used to
    # do) also fixes a real bug: JSON_BLOCK_RE.search() scans the WHOLE
    # response for any ``` occurrence, anywhere - including one embedded
    # INSIDE a JSON string value, e.g. a question whose own text is "What
    # is the output of this program?\n```c\n#include <stdio.h>\n...```"
    # (completely normal for a C/C++ programming question). The old code
    # would find that inner fence, grab everything between it and the
    # NEXT ``` as if THAT were "the JSON", and discard the real, fully
    # valid `{"questions": [...]}` around it - producing "Expecting
    # value: line 1 column 1" because a raw C code fragment obviously
    # isn't JSON. Confirmed directly: every one of the "_parse" failures
    # on a real job had a response that started with valid JSON in the
    # response-preview diagnostic, and every failing chunk contained a
    # question with an embedded ```c / ```cpp code block.
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Direct parse failed - NOW consider that the response might genuinely
    # be wrapped in an outer fence (some models do add ```json ... ```
    # around the whole reply). Anchor the match to the start and end of
    # the string (not a bare .search() anywhere in the middle) so an
    # embedded code fence deeper in the text can never be mistaken for
    # the outer wrapper the way the old unanchored regex was.
    fenced = re.match(r"```(?:json)?\s*(.*)```\s*$", stripped, re.IGNORECASE | re.DOTALL)
    text = fenced.group(1).strip() if fenced else stripped

    try:
        return json.loads(text)
    except json.JSONDecodeError as first_error:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        # Both the direct parse and the whole-response bracket-slice
        # failed. Previously that meant the entire chunk's questions were
        # silently discarded even if most of them were written out
        # correctly before the break - recover whatever individual
        # question objects are still well-formed instead of giving up
        # entirely.
        salvaged = salvage_question_objects(text)
        if salvaged:
            return {"questions": salvaged}

        # first_error's own message ("Expecting value: line 1 column 1
        # (char 0)") is what json.JSONDecodeError says for ANY text that
        # doesn't open with a valid JSON token - not just a genuinely
        # empty string. Attaching a preview of the real response text is
        # what turns that from a dead end into something actionable for
        # whatever failure mode shows up next.
        preview = original_text[:300].replace("\n", " ")
        raise ValueError(
            f"{first_error} — response preview: {preview!r}"
        ) from first_error


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
        options = item.get("options") or []
        if not question_text or not isinstance(options, list):
            continue

        options = [str(option).strip() for option in options if str(option).strip()]
        if len(options) < 2:
            continue

        try:
            question_no = int(item.get("question_no") or item.get("questionNo") or fallback_index)
        except (TypeError, ValueError):
            question_no = fallback_index

        while question_no in seen_numbers:
            question_no += 1
        seen_numbers.add(question_no)

        correct_indexes = item.get("correct_option_indexes") or item.get("correctOptionIndexes") or [0]
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

        if not valid_correct_indexes:
            valid_correct_indexes = [0]

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
                "source_page": parse_positive_int(item.get("source_page") or item.get("sourcePage")),
                "confidence": max(0, min(confidence, 100)),
                "metadata": metadata,
                "diagrams": diagrams,
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


def parse_positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None