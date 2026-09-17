"""Regression test for the IAF Group Y booklet failure mode.

Run from backend/:

    python -m worker.extraction_selftest
    python -m worker.extraction_selftest /path/to/booklet.pdf
"""

import os
import sys

from .pdf_extract import is_answer_key_page, parse_answer_key
from .placeholders import is_placeholder_question
from .question_parser import parse_questions
from .reconcile import reconcile_questions


failures = 0


def check(name, condition, detail=""):
    global failures
    status = "ok  " if condition else "FAIL"
    print(f"{status} - {name}" + (f" ({detail})" if detail else ""))
    if not condition:
        failures += 1


ANSWER_KEY = """
ANSWER KEY
1. A
2. D
21. D
22. B
50. D
Scoring: Correct × 1 − Wrong × 0.25
"""

QUESTION_PAGE = """
SECTION — REASONING
21. If 9 is related to 14 by adding 5, then 5 is related to ? by the same rule.
(A) 14
(B) 6
(C) 8
(D) 10
22. If 12 is related to 18 by adding 6, then 6 is related to ? by the same rule.
(A) 7
(B) 12
(C) 18
(D) 9
"""


check("answer-key heading is detected", is_answer_key_page(ANSWER_KEY))
check("question page is not an answer key", not is_answer_key_page(QUESTION_PAGE))
check("answer-key map reads 21.D", parse_answer_key(ANSWER_KEY).get(21) == "D")

stub = {
    "question_no": 21,
    "text": "Reasoning question 21",
    "options": ["A", "B", "C", "D"],
    "correct_option_indexes": [3],
    "metadata": {"parser": "gemini_image_ai_v1"},
}
real = {
    "question_no": 21,
    "text": "If 9 is related to 14 by adding 5, then 5 is related to ? by the same rule.",
    "options": ["14", "6", "8", "10"],
    "correct_option_indexes": [3],
    "metadata": {"parser": "regex_v1"},
}

check("generic 'Reasoning question 21' is a placeholder", is_placeholder_question(stub))
check("real reasoning stem is not a placeholder", not is_placeholder_question(real))

merged, decisions = reconcile_questions([real], [stub])
check("reconcile keeps the regex body over the stub", len(merged) == 1)
check(
    "reconcile winner is the real stem",
    merged and "related to 14" in merged[0]["text"],
)

pages = [
    {"page": 1, "text": QUESTION_PAGE, "needsVision": False, "isAnswerKey": False},
    {"page": 2, "text": ANSWER_KEY, "needsVision": True, "isAnswerKey": True},
]
parsed = parse_questions(pages)
check("regex parses 2 questions from the paper (not the key)", len(parsed) == 2)
check(
    "answer key applied to Q21",
    parsed and parsed[0]["correct_option_indexes"] == [3] and parsed[0]["metadata"].get("answerKey") == "D",
)
check(
    "Q21 stem is the real reasoning question",
    parsed and "related to 14" in parsed[0]["text"],
)

two_papers = [
    {"page": 1, "text": QUESTION_PAGE},
    {"page": 2, "text": ANSWER_KEY},
    {"page": 3, "text": QUESTION_PAGE},
    {"page": 4, "text": ANSWER_KEY},
]
parsed_two = parse_questions(two_papers)
nos = [q["question_no"] for q in parsed_two]
check(
    "second paper is packed sequentially (no 50-wide key gap)",
    len(nos) == 4 and max(nos) - min(nos) == 3 and len(set(nos)) == 4,
    detail=str(nos),
)


def run_against_pdf(pdf_path):
    from .pdf_extract import extract_pdf_pages

    pages = extract_pdf_pages(pdf_path)
    answer_key_pages = [p["page"] for p in pages if p.get("isAnswerKey")]
    vision_pages = [p["page"] for p in pages if p.get("needsVision")]
    check(
        "no answer-key page is flagged needsVision",
        not any(p.get("isAnswerKey") and p.get("needsVision") for p in pages),
        detail=f"keys={answer_key_pages} vision={vision_pages}",
    )
    parsed = parse_questions(pages)
    check("regex extracted more than the first English section", len(parsed) > 20, detail=str(len(parsed)))
    q21 = next((q for q in parsed if q["question_no"] == 21), None)
    check("question 21 exists", q21 is not None)
    if q21:
        check(
            "question 21 is not a section-name stub",
            not is_placeholder_question(q21),
            detail=q21["text"][:80],
        )
        check(
            "question 21 has real option text, not A/B/C/D",
            q21["options"] != ["A", "B", "C", "D"],
            detail=str(q21["options"][:4]),
        )
        check(
            "question 21 answer is D (from the key)",
            q21.get("correct_option_indexes") == [3],
            detail=str(q21.get("correct_option_indexes")),
        )
    nos = [q["question_no"] for q in parsed]
    if nos:
        check(
            "question numbers are dense 1..N",
            min(nos) == 1 and max(nos) == len(parsed) and len(set(nos)) == len(parsed),
            detail=f"count={len(parsed)} min={min(nos)} max={max(nos)}",
        )


if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PAPERFLOW_TEST_PDF")
    if pdf:
        print(f"\n--- live PDF: {pdf} ---\n")
        run_against_pdf(pdf)
    print()
    raise SystemExit(1 if failures else 0)
