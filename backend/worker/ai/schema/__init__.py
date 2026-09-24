"""Re-exports this subpackage's public surface - response_schemas.py's
constants, json_repair.py's parsing, question_normalization.py's cleanup -
so callers do `from .schema import X` / `from ..schema import X` without
needing to know which submodule X actually lives in.
"""

from .json_repair import extract_json_payload, salvage_question_objects
from .question_normalization import normalize_ai_questions
from .response_schemas import (
    GEMINI_GRADING_RESPONSE_SCHEMA,
    GEMINI_QUESTION_RESPONSE_SCHEMA,
    GEMINI_TEMPLATE_RESPONSE_SCHEMA,
    OPENAI_GRADING_RESPONSE_SCHEMA,
    OPENAI_QUESTION_RESPONSE_SCHEMA,
    OPENAI_TEMPLATE_RESPONSE_SCHEMA,
)

__all__ = [
    "GEMINI_GRADING_RESPONSE_SCHEMA",
    "GEMINI_QUESTION_RESPONSE_SCHEMA",
    "GEMINI_TEMPLATE_RESPONSE_SCHEMA",
    "OPENAI_GRADING_RESPONSE_SCHEMA",
    "OPENAI_QUESTION_RESPONSE_SCHEMA",
    "OPENAI_TEMPLATE_RESPONSE_SCHEMA",
    "extract_json_payload",
    "normalize_ai_questions",
    "salvage_question_objects",
]
