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
    }

    schema = {
        "type": "object",
        "properties": properties,
        "required": ["question_no", "text", "options", "correct_option_indexes"],
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


JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)


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

    fenced = JSON_BLOCK_RE.search(text)
    if fenced:
        text = fenced.group(1)

    text = text.strip()

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

        raise first_error


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

        normalized.append(
            {
                "question_no": question_no,
                "topic": clean_optional_text(item.get("topic")),
                "subtopic": clean_optional_text(item.get("subtopic")),
                "passage": clean_optional_text(item.get("passage")),
                "text": question_text,
                "explanation": clean_optional_text(item.get("explanation")),
                "options": options,
                "correct_option_indexes": valid_correct_indexes,
                "source_page": parse_positive_int(item.get("source_page") or item.get("sourcePage")),
                "confidence": max(0, min(confidence, 100)),
                "metadata": metadata,
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