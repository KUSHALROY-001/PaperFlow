"""Tests for even spread of notes-generated questions.

    python -m worker.notes_question_count_selftest
"""

from __future__ import annotations

import json
import re
import sys

from .ai.provider import (
    _allocate_counts,
    _normalize_desired_count,
    _select_notes_work,
    _spread_indices,
    _spread_keep,
    generate_questions_from_notes,
)
from .config import AI_NOTES_QUESTIONS_PER_CHUNK, AI_NOTES_MAX_QUESTIONS


failures = 0


def check(name, condition, detail=""):
    global failures
    status = "ok  " if condition else "FAIL"
    print(f"{status} - {name}" + (f" ({detail})" if detail else ""))
    if not condition:
        failures += 1


check("spread of 1 from 10 is the first index", _spread_indices(1, 10) == [0])
check("spread of 2 includes first and last", _spread_indices(2, 10) == [0, 9])
check(
    "spread of 5 across 20 is unique and includes ends",
    _spread_indices(5, 20) == [0, 4, 9, 14, 19]
    and len(set(_spread_indices(5, 20))) == 5,
)
check("spread k>=n is the full range", _spread_indices(12, 10) == list(range(10)))
check("allocate 5 across 5 is one each", _allocate_counts(5, 5) == [1, 1, 1, 1, 1])
check("allocate 5 across 20 has five 1s spread out", _allocate_counts(5, 20).count(1) == 5)
check(
    "allocate extras are spread (not dumped on 0,1,2)",
    _allocate_counts(23, 20)[-1] == 2
    and _allocate_counts(23, 20)[1] == 1
    and _allocate_counts(23, 20)[2] == 1,
)
check("spread trim of 3 from 10 keeps ends", _spread_keep(list(range(10)), 3) == [0, 4, 9])
check("blank desired count is None", _normalize_desired_count("") is None)
check("desired count is clamped to max", _normalize_desired_count(9999) == AI_NOTES_MAX_QUESTIONS)
check("desired count 0 is ignored", _normalize_desired_count(0) is None)


class FakeProvider:
    name = "fake"

    def __init__(self):
        self.prompts = []

    def generate_json(self, _system, user):
        self.prompts.append(user)
        match = re.search(r"approximately (\d+)", user)
        count = int(match.group(1)) if match else 8
        questions = [
            {
                "question_no": i + 1,
                "text": f"Concept question {i + 1} covering a distinct idea.",
                "options": ["alpha", "beta", "gamma", "delta"],
                "correct_option_indexes": [0],
            }
            for i in range(count)
        ]
        return json.dumps({"questions": questions})


def make_big_pages(n):
    body = "content " * 2000
    return [{"page": i, "text": f"Notes page {i} {body}"} for i in range(1, n + 1)]


provider = FakeProvider()
questions, summary = generate_questions_from_notes(
    make_big_pages(1), provider, desired_count=None
)
check(
    "blank count still asks ~8 from a single chunk",
    len(questions) == AI_NOTES_QUESTIONS_PER_CHUNK
    and "approximately 8" in provider.prompts[0],
    detail=str(len(questions)),
)

provider = FakeProvider()
questions, summary = generate_questions_from_notes(
    make_big_pages(1), provider, desired_count=40
)
check(
    "requested 40 from one chunk asks that chunk for 40",
    len(questions) == 40 and "approximately 40" in provider.prompts[0],
    detail=str(len(questions)),
)
check("summary records requestedQuestionCount", summary.get("requestedQuestionCount") == 40)

provider = FakeProvider()
questions, summary = generate_questions_from_notes(
    make_big_pages(10), provider, desired_count=5
)
check(
    "requested 5 from 10 chunks calls only 5 chunks",
    len(provider.prompts) == 5,
    detail=str(len(provider.prompts)),
)
check(
    "those 5 chunks are spread, not the first five pages",
    "Notes page 1 " in provider.prompts[0]
    and "Notes page 10 " in provider.prompts[-1]
    and not all(f"Notes page {i} " in "".join(provider.prompts) for i in range(1, 6)),
)
check("returns 5 questions", len(questions) == 5, detail=str(len(questions)))

provider = FakeProvider()
questions, summary = generate_questions_from_notes(
    make_big_pages(10), provider, desired_count=25
)
check(
    "requested 25 from 10 chunks calls every chunk",
    len(provider.prompts) == 10,
    detail=str(len(provider.prompts)),
)
check("returns 25 questions", len(questions) == 25, detail=str(len(questions)))

trimmed = _spread_keep(list(range(12)), 5)
check(
    "overshoot trim is spread not a tail cut",
    trimmed[0] == 0 and trimmed[-1] == 11 and 11 in trimmed and 10 not in trimmed,
    detail=str(trimmed),
)

items = [{"start_page": i, "kind": "text"} for i in range(20)]
selected, counts = _select_notes_work(items, 5)
check(
    "select 5 of 20 uses spread indices",
    [item["start_page"] for item in selected] == [0, 4, 9, 14, 19],
)
check("each of those is asked for 1", counts == [1, 1, 1, 1, 1])

print()
raise SystemExit(1 if failures else 0)
