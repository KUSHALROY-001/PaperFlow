"""Reads the paper's OWN section headers (question count + marking scheme)
straight from the extracted page text, in document order.

Why this exists: a JEE Advanced paper prints the scoring for every section
right in the header, e.g.

    SECTION 1 (Maximum Marks: 12)
    This section contains FOUR (04) questions.
    Full Marks : +3 ...   Negative Marks : -1 ...

Per-question marks used to come from two places only - the AI reading them
off the page (which, when told it MUST set them, writes 0 / 0 for any
question whose header sat on another page chunk) and the applied
template's section ranges (which assume the template's total question
count; a JEE template built for 54 questions puts every range boundary in
the wrong place on a 51-question paper, and its by_question_type map can
only express single/multi, never numerical or matching-list). Neither can
be wrong here: the paper states its own scheme, and the cumulative
question counts of its sections give the exact question_no range of each
one (4+3+6+4 per subject -> 1-17, 18-34, 35-51) regardless of any
template.
"""

import re

_SECTION_SPLIT = re.compile(r"SECTION\s+\d+\s*\(Maximum Marks:\s*\d+\)", re.IGNORECASE)
_COUNT = re.compile(r"This section contains\s+[A-Za-z\-]+\s*\((\d+)\)", re.IGNORECASE)
_FULL = re.compile(r"Full Marks\s*:\s*\+?\s*(\d+)", re.IGNORECASE)
# Printed with a unicode minus (U+2212), an en dash or a hyphen depending
# on the PDF's font.
_NEGATIVE = re.compile(r"Negative Marks\s*:\s*[\u2212\u2013\u2014\-]\s*(\d+)", re.IGNORECASE)


def parse_paper_sections(pages):
    """Ordered list of {"count", "marks_per_correct", "negative_marks_per_wrong"}
    for every SECTION block found across `pages`, or [] when the paper has
    no recognizable section headers (then callers fall back to the AI /
    template exactly as before)."""
    text = "\n".join(
        (page.get("text") or "")
        for page in pages
        if not page.get("isAnswerKey")
    )
    headers = list(_SECTION_SPLIT.finditer(text))
    sections = []
    for index, header in enumerate(headers):
        end = headers[index + 1].start() if index + 1 < len(headers) else len(text)
        # The header block ends at the first "Q.1"-style question label;
        # keep the scan to the instructions so a question that happens to
        # contain the words "Full Marks" can't leak in.
        block = text[header.end():end]
        cut = re.search(r"\bQ\.\s*\d+", block)
        if cut:
            block = block[: cut.start()]
        count = _COUNT.search(block)
        full = _FULL.search(block)
        if not count or not full:
            continue
        negative = _NEGATIVE.search(block)
        sections.append(
            {
                "count": int(count.group(1)),
                "marks_per_correct": int(full.group(1)),
                # No "Negative Marks" line (e.g. numerical-value sections:
                # "Zero Marks: 0 In all other cases") means no deduction.
                "negative_marks_per_wrong": int(negative.group(1)) if negative else 0,
            }
        )
    return sections


def section_ranges(sections):
    """Cumulative (start, end, marks, negative) per section, 1-indexed."""
    ranges = []
    cursor = 1
    for section in sections:
        end = cursor + section["count"] - 1
        ranges.append(
            (
                cursor,
                end,
                section["marks_per_correct"],
                section["negative_marks_per_wrong"],
            )
        )
        cursor = end + 1
    return ranges
