import json
import re


JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)


def extract_json_payload(text):
    if not text:
        raise ValueError("AI response was empty")

    fenced = JSON_BLOCK_RE.search(text)
    if fenced:
        text = fenced.group(1)

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start : end + 1])


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
