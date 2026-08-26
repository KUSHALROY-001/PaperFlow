"""Catches the highest-frequency class of broken LaTeX the extraction
pipeline can produce: an unbalanced brace or bracket inside a $...$/
$$...$$ span. This is what showed up as a silent KaTeX parse error in
the editor, discovered only when a human happened to open that specific
question - see worker/db.py#replace_questions for where this gets called
before a question is ever saved, and PaperFlow's Review Queue for where
a flagged question now surfaces automatically instead of relying on a
human noticing.

Deliberately a balance check, not a full LaTeX grammar validator - it
will not catch every possible KaTeX parse error (an unknown macro, the
wrong argument count to \\frac, and so on), but it catches the single
failure category that's actually shown up in practice, with zero new
dependencies and no cross-language call out to a JS KaTeX build. A
stricter version calling the real katex npm package (already a backend
Node dependency, used by pdf-export/math-html.js) is a reasonable later
upgrade if a gap between this check and real KaTeX ever actually causes
a problem in practice - not needed to get most of the value now.
"""

import re

# $$...$$ / \[...\] (display math) and $...$ / \(...\) (inline math) -
# same four delimiter shapes MathText.jsx/richTextDoc.js on the frontend
# recognize, so this checks exactly what will actually be rendered as
# math, nothing more and nothing less. Inline $...$ excludes literal
# newlines the same way the frontend's own regex does, so a stray
# un-paired "$" (e.g. a genuine currency amount elsewhere in the same
# field) can't accidentally swallow unrelated text up to the next "$" on
# a completely different line.
MATH_SPAN_RE = re.compile(
    r"(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))"
)


def _strip_delimiters(token):
    if token.startswith("$$") and token.endswith("$$"):
        return token[2:-2]
    if token.startswith("\\[") and token.endswith("\\]"):
        return token[2:-2]
    if token.startswith("\\(") and token.endswith("\\)"):
        return token[2:-2]
    return token[1:-1]  # single-$ inline math


def _check_balance(latex):
    """None if `latex`'s braces/brackets are balanced, otherwise a short
    human-readable description of the imbalance - shown to a reviewer in
    the Review Queue, so it names what's wrong rather than just "invalid",
    same spirit as the KaTeX error message it was found from."""
    curly_depth = 0
    square_depth = 0

    for ch in latex:
        if ch == "{":
            curly_depth += 1
        elif ch == "}":
            curly_depth -= 1
            if curly_depth < 0:
                return "unmatched '}' - a closing brace with no matching '{'"
        elif ch == "[":
            square_depth += 1
        elif ch == "]":
            square_depth -= 1
            if square_depth < 0:
                return "unmatched ']' - a closing bracket with no matching '['"

    if curly_depth > 0:
        plural = "s" if curly_depth > 1 else ""
        return f"missing {curly_depth} closing '}}' (unclosed '{{'{plural})"
    if square_depth > 0:
        plural = "s" if square_depth > 1 else ""
        return f"missing {square_depth} closing ']' (unclosed '['{plural})"

    return None


def find_math_errors(text):
    """Scans `text` for math spans and checks each one's brace/bracket
    balance. Returns a list of {"expr": <the LaTeX source>, "error":
    <description>} dicts, one per broken span - empty list if `text` has
    no math or every span it has is balanced."""
    if not text:
        return []

    errors = []
    for match in MATH_SPAN_RE.finditer(text):
        latex = _strip_delimiters(match.group(0))
        problem = _check_balance(latex)
        if problem:
            errors.append({"expr": latex.strip(), "error": problem})

    return errors


# Fields on an extracted question dict that can carry math -
# worker/db.py#replace_questions inserts all four of these into
# question_contents. Kept as an explicit list (not "every string field")
# so adding an unrelated future field to the question dict doesn't
# silently start getting math-scanned too.
TEXT_FIELDS = ("text", "explanation", "passage")


def find_all_math_errors(question):
    """Checks every text-bearing field of an extracted question dict -
    question text, explanation, passage, and every option - tagging each
    error with which field it came from, so a reviewer isn't left
    guessing which of several fields the broken formula is actually in."""
    errors = []

    for field in TEXT_FIELDS:
        value = question.get(field)
        if value:
            for err in find_math_errors(value):
                errors.append({**err, "field": field})

    for index, option in enumerate(question.get("options") or []):
        option_text = option if isinstance(option, str) else option.get("optionText", "")
        for err in find_math_errors(option_text):
            errors.append({**err, "field": f"options[{index}]"})

    return errors
