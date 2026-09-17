"""Detect invented filler questions (answer-key hallucinations).

Kept as its own module so regex parsing, AI normalization, and
reconciliation can all share the same definition without importing the
AI provider stack.
"""

import re

_BARE_OPTION_LABEL_RE = re.compile(r"^\(?[a-zA-Z]\)?\.?$")

# Invented stems Gemini produces when it is shown an answer-key page (or
# the paper's "English Q1-20 | Reasoning Q21-35 | GA Q36-50" pattern)
# instead of the actual question text. Confirmed on a live 105-page IAF
# Group Y booklet: every answer-key table was routed to vision, and
# questions 21+ came back as "Reasoning question 21" / options A,B,C,D.
_GENERIC_SECTION_QUESTION_RE = re.compile(
    r"^(?:english|reasoning|general awareness|general knowledge|"
    r"gk|ga|mathematics|maths?|physics|chemistry|biology|aptitude|"
    r"quantitative|verbal|logical(?: reasoning)?|untitled|question)"
    r"\s+question\s+\d+\s*$",
    re.I,
)


def is_placeholder_question(question):
    """True when this is invented filler, not an extracted stem."""
    if not isinstance(question, dict):
        return False
    text = str(
        question.get("text") or question.get("question_text") or ""
    ).strip()
    options = question.get("options") or []
    if _GENERIC_SECTION_QUESTION_RE.match(text):
        return True
    if len(options) >= 2 and all(
        _BARE_OPTION_LABEL_RE.match(str(option).strip())
        and "![[img:" not in str(option)
        for option in options
    ):
        return True
    return False
