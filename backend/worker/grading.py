"""Asynchronous rubric grading for submitted written answers.

Each database batch belongs to exactly one attempt and contains at most 12
question ids. This keeps the AI request bounded, and never mixes answers from
different students.

On a failed AI response (empty / truncated / wrong shape), a batch with more
than one question is split in half and the two halves are re-queued once each
— so a max-output-token cut on a large batch can still succeed as smaller
requests. The original batch is marked failed and is never claimed again.
A single-question batch that fails stays failed (no further split possible).

STRICT GRADING
--------------
The model is NOT asked for one holistic percentage (that is what made every
"covers all the hints" answer come back as 10/10). Instead the code decides
which criteria a question is scored on (see _plan_row), the model scores each
criterion against explicit score bands, and the code does the arithmetic
(_score_from_criteria). The model's own "percentage" is only a fallback when
its criterion scores are missing or incomplete.
"""

import json
import re

from .ai import get_provider
from .ai.schemas import extract_json_payload
from .db import get_connection


# --------------------------------------------------------------------------
# Criteria. Maxes only need to be relative to each other - the final
# percentage is earned / total_max.
# --------------------------------------------------------------------------

# Open-ended writing (story, letter, notice, essay, report, long answers...).
# This is used even when the question also has a content rubric: a rubric that
# only lists "mentions the dog / the bridge / the reflection" would otherwise
# hand out full marks to any answer that touches each beat.
WRITING_CRITERIA = [
    {
        "criterion_id": "content",
        "name": "Content and relevance",
        "max": 40,
        "how_to_score": (
            "Are all required points/hints covered AND developed with detail, "
            "reasons or examples? Bare one-line coverage of a point is 'adequate', "
            "not 'good'."
        ),
    },
    {
        "criterion_id": "format",
        "name": "Format and organisation",
        "max": 20,
        "how_to_score": (
            "Correct conventions for this form (letter: address, date, salutation, "
            "paragraphs, closing; notice: issuing body, heading, date, event details "
            "such as date/time/venue, signatory with designation; story: beginning, "
            "development, ending, moral if asked; essay/report: title, structured "
            "paragraphs, conclusion) and logical paragraphing."
        ),
    },
    {
        "criterion_id": "language",
        "name": "Language and expression",
        "max": 20,
        "how_to_score": (
            "Range of vocabulary, sentence variety, cohesion and suitable tone/register. "
            "Simple, repetitive wording is 'adequate' at best."
        ),
    },
    {
        "criterion_id": "accuracy",
        "name": "Accuracy",
        "max": 20,
        "how_to_score": "Grammar, spelling and punctuation (and factual correctness, where facts are stated).",
    },
]

# Factual short answers that have a model answer but no analytic rubric.
FACTUAL_CRITERIA = [
    {
        "criterion_id": "key_ideas",
        "name": "Correct key ideas",
        "max": 60,
        "how_to_score": "Are the key ideas of the model answer stated correctly? A wrong idea earns nothing.",
    },
    {
        "criterion_id": "completeness",
        "name": "Completeness and detail",
        "max": 25,
        "how_to_score": "Are all the required parts present, with enough detail for the marks available?",
    },
    {
        "criterion_id": "clarity",
        "name": "Clarity of expression",
        "max": 15,
        "how_to_score": "Is it clearly and precisely expressed, without contradictions or vagueness?",
    },
]

# A question is treated as a writing task when it is a long answer, or its text
# asks the student to write/draft/compose one of the usual composition forms.
_WRITING_FORMS = (
    r"story|letter|notice|essay|article|report|paragraph|dialogue|speech|diary|"
    r"e-?mail|application|composition|advertisement|poster|biography|"
    r"character sketch|pr[eé]cis"
)
_WRITING_TASK_RE = re.compile(
    rf"\b(?:write|draft|compose|prepare|develop|complete|continue)\b.{{0,60}}\b(?:{_WRITING_FORMS})\b"
    rf"|\b(?:{_WRITING_FORMS})\s+(?:writing|composition)\b",
    re.IGNORECASE | re.DOTALL,
)

_WORD_RE = re.compile(r"[\w'’-]+", re.UNICODE)


GRADING_SYSTEM_PROMPT = """
You are a strict, experienced board-exam examiner grading written answers.
Your marks must stand up to a moderator: most students do NOT receive full
marks.

Each question comes with a "criteria" list. Score EVERY criterion from 0 up to
its "max" (decimals allowed) and return the scores in "criteria_scores" using
the exact criterion_id. The system adds your criterion scores up itself.

Grade only what is actually written. Never credit what the student "probably
meant", never assume missing details, and never give marks for wording copied
from the question or its hints. Grade every question independently.

SCORE BANDS - apply to EACH criterion, as a fraction of its max:
  0-20%    absent, irrelevant, or almost entirely wrong
  21-40%   weak: major omissions or many errors
  41-60%   adequate but basic: the minimum is met, with little development,
           simple or repetitive vocabulary, or noticeable errors
  61-80%   good: mostly complete and well developed, only minor errors
  81-100%  excellent: thorough, precise, polished, virtually error-free. Rare.
Covering every required point earns the ADEQUATE band, not the top one; the
upper bands need depth, precision and polish. If unsure between two bands,
choose the lower one.

CALIBRATION (overall, across all criteria):
  - Complete, correctly formatted, covers every required point, but basic,
    undeveloped or repetitive: about 41-60% overall (5-6 marks out of 10).
  - Very short, skips required details, weak or missing format, or barely
    developed: about 10-30% overall (1-3 marks out of 10).
  - Off-topic, copied from the question, or unintelligible: 0-10%.
  - 90% or more only for an answer an examiner would call excellent with no
    significant weakness.

LENGTH: "student_word_count" is given. "word_limit", when present, comes from
the paper - read the question wording to see whether it is a target ("about",
"in N words") or a maximum ("not more than"). For writing tasks, an answer far
below a target length, or too short to develop the marks available, cannot
reach the good band for content or language. Within a stated maximum, brevity
alone is not penalised - judge completeness instead. With no limit, expect
development in proportion to the marks (a 10-mark story, letter or essay
normally needs roughly 100+ words; a notice roughly 50-80).

"content_requirements", when given, list what the content must include. Each
missing item pushes the content score down into the weak band. Items present
only in a bare one-line way stay in the adequate band.
For rubric questions the criteria ARE the rubric points: credit a point when
the idea is demonstrated (a correct paraphrase counts), give partial credit
for a partly demonstrated point, and no credit for a point that is only hinted
at.

Return JSON only, with this shape:
{"grades":[{"analysis":"at most 3 short sentences: the main strength, then the
specific weaknesses that cost marks","criteria_scores":[{"criterion_id":"...",
"score":0}],"percentage":0-100 (your overall estimate; used only as a
fallback),"points_hit":["short phrases for what the answer did well"],
"question_index":0}]}
""".strip()


# --------------------------------------------------------------------------
# Planning / scoring helpers (pure functions - covered by grading_selftest.py)
# --------------------------------------------------------------------------

def _to_float(value, default=0.0):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number != number or number in (float("inf"), float("-inf")):
        return default
    return number


def _count_words(text):
    return len(_WORD_RE.findall(text or ""))


def _clean_rubric(raw_rubric):
    """grading_rubric is JSONB: normally [{point, weight}], tolerate strings."""
    entries = []
    if not isinstance(raw_rubric, list):
        return entries
    for entry in raw_rubric:
        if isinstance(entry, dict):
            point = str(entry.get("point") or "").strip()
            weight = _to_float(entry.get("weight"), 1.0)
        else:
            point = str(entry or "").strip()
            weight = 1.0
        if not point:
            continue
        entries.append({"point": point, "weight": weight if weight > 0 else 1.0})
    return entries


def _is_writing_task(row):
    if row.get("question_type") == "long_answer":
        return True
    return bool(_WRITING_TASK_RE.search(row.get("question_text") or ""))


def _plan_row(row):
    """Decide how one answer is scored: which criteria, and the facts the
    model needs (word count, requirements). Deterministic - no AI involved."""
    rubric = _clean_rubric(row.get("grading_rubric"))
    expected = (row.get("expected_answer") or "").strip()
    maximum = _to_float(row.get("marks_per_correct")) or _to_float(row.get("default_marks"))

    if _is_writing_task(row):
        kind = "writing"
        criteria = [dict(c) for c in WRITING_CRITERIA]
    elif rubric:
        kind = "rubric"
        criteria = [
            {
                "criterion_id": f"r{index}",
                "name": entry["point"],
                "max": entry["weight"],
                "how_to_score": "Credit only if this point is actually demonstrated in the answer.",
            }
            for index, entry in enumerate(rubric, start=1)
        ]
    else:
        kind = "factual"
        criteria = [dict(c) for c in FACTUAL_CRITERIA]

    return {
        "kind": kind,
        "criteria": criteria,
        "maximum": maximum,
        "word_count": _count_words(row.get("answer_text")),
        "requirements": rubric,
        "model_answer": expected or None,
    }


def _score_from_criteria(criteria, returned_scores):
    """Total the model's per-criterion scores in code.

    Returns (percentage, [(criterion, score), ...]) or None when the model's
    scores are unusable (missing / incomplete), so the caller can fall back.
    Each score is clamped to [0, max] so the model cannot exceed a criterion's
    own limit.
    """
    by_id = {}
    for item in returned_scores or []:
        if not isinstance(item, dict):
            continue
        criterion_id = str(item.get("criterion_id") or item.get("id") or "").strip()
        score = _to_float(item.get("score"), None)
        if criterion_id and score is not None:
            by_id.setdefault(criterion_id, score)

    total_max = sum(_to_float(c["max"]) for c in criteria)
    if total_max <= 0:
        return None
    if any(c["criterion_id"] not in by_id for c in criteria):
        return None

    details = []
    earned = 0.0
    for criterion in criteria:
        limit = _to_float(criterion["max"])
        score = max(0.0, min(limit, by_id[criterion["criterion_id"]]))
        earned += score
        details.append((criterion, score))
    return 100.0 * earned / total_max, details


def _format_reasoning(grade, details, used_fallback):
    analysis = str(grade.get("analysis") or grade.get("reasoning") or "").strip()
    lines = []
    if details:
        parts = []
        for criterion, score in details:
            name = criterion["name"]
            name = name if len(name) <= 60 else name[:57] + "..."
            parts.append(f"{name} {score:g}/{_to_float(criterion['max']):g}")
        lines.append("Scores: " + "; ".join(parts))
    elif used_fallback:
        lines.append("Scores: overall estimate only (criterion scores were missing).")
    if analysis:
        lines.append(analysis)
    return "\n".join(lines).strip() or None


def _resolve_grade(plan, grade):
    """-> (percentage 0-100, reasoning text)."""
    scored = _score_from_criteria(plan["criteria"], grade.get("criteria_scores"))
    if scored is not None:
        percentage, details = scored
        return max(0.0, min(100.0, percentage)), _format_reasoning(grade, details, False)
    percentage = max(0.0, min(100.0, _to_float(grade.get("percentage"))))
    return percentage, _format_reasoning(grade, None, True)


# --------------------------------------------------------------------------
# Queue handling
# --------------------------------------------------------------------------

def claim_next_grading_batch(connection):
    # Only 'queued' — never re-claim 'failed'. A failed multi-question batch
    # is recovered by inserting two smaller queued halves (see
    # _split_failed_batch_into_halves), not by retrying the same row.
    with connection.transaction():
        batch = connection.execute(
            """
            SELECT * FROM attempt_grading_batches
            WHERE status = 'queued'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        ).fetchone()
        if not batch:
            return None
        connection.execute(
            """
            UPDATE attempt_grading_batches
            SET status = 'running', error_message = NULL, started_at = now()
            WHERE id = %s
            """,
            [batch["id"]],
        )
        return batch


def _load_batch_questions(connection, batch):
    return connection.execute(
        """
        SELECT
          ea.question_id, ea.answer_text,
          q.question_text, q.question_type, q.grading_rubric, q.expected_answer,
          q.answer_word_limit,
          q.marks_per_correct, mt.marks_per_correct AS default_marks
        FROM exam_answers ea
        JOIN questions q ON q.id = ea.question_id
        JOIN exam_attempts at ON at.id = ea.attempt_id
        JOIN mock_tests mt ON mt.id = at.mock_test_id
        WHERE ea.attempt_id = %s
          AND ea.question_id = ANY(%s::uuid[])
          AND ea.grading_status = 'pending_grading'
        ORDER BY array_position(%s::uuid[], ea.question_id)
        """,
        [batch["attempt_id"], batch["question_ids"], batch["question_ids"]],
    ).fetchall()


def _build_prompt(rows, plans):
    questions = []
    for index, (row, plan) in enumerate(zip(rows, plans)):
        item = {
            "question_index": index,
            "question": row["question_text"],
            "question_type": row.get("question_type"),
            "maximum_marks": plan["maximum"],
            "criteria": [
                {
                    "criterion_id": c["criterion_id"],
                    "name": c["name"],
                    "max": c["max"],
                    "how_to_score": c["how_to_score"],
                }
                for c in plan["criteria"]
            ],
            "student_word_count": plan["word_count"],
            "student_answer": row["answer_text"],
        }
        if row.get("answer_word_limit"):
            item["word_limit"] = row["answer_word_limit"]
        if plan["kind"] == "writing" and plan["requirements"]:
            item["content_requirements"] = [entry["point"] for entry in plan["requirements"]]
        if plan["model_answer"]:
            item["model_answer_for_reference"] = plan["model_answer"]
        questions.append(item)
    return "Grade these independent answers:\n" + json.dumps({"questions": questions})


def _recompute_attempt(connection, attempt_id):
    connection.execute(
        """
        UPDATE exam_attempts at
        SET
          attempted_count = stats.attempted_count,
          correct_count = stats.correct_count,
          wrong_count = stats.wrong_count,
          unattempted_count = GREATEST(at.total_questions - stats.attempted_count, 0),
          score = stats.score
        FROM (
          SELECT
            ea.attempt_id,
            COUNT(*) FILTER (WHERE coalesce(ea.selected_option_indexes, '{}') <> '{}'::int[] OR coalesce(trim(ea.answer_text), '') <> '')::int AS attempted_count,
            COUNT(*) FILTER (WHERE ea.is_correct IS TRUE)::int AS correct_count,
            COUNT(*) FILTER (WHERE ea.is_correct IS FALSE)::int AS wrong_count,
            COALESCE(SUM(ea.marks_awarded), 0) AS score
          FROM exam_answers ea
          WHERE ea.attempt_id = %s
          GROUP BY ea.attempt_id
        ) stats
        WHERE at.id = stats.attempt_id
        """,
        [attempt_id],
    )


def _normalize_question_ids(raw_ids):
    if not raw_ids:
        return []
    return [str(qid) for qid in list(raw_ids)]


def _split_failed_batch_into_halves(connection, batch, error):
    """Mark the failed batch terminal and enqueue two half-size batches.

    Returns the number of new queued halves (0 or 2). A single-question
    batch cannot be split further.
    """
    question_ids = _normalize_question_ids(batch.get("question_ids"))
    if len(question_ids) < 2:
        connection.execute(
            """
            UPDATE attempt_grading_batches
            SET status = 'failed', error_message = %s
            WHERE id = %s
            """,
            [str(error)[:2000], batch["id"]],
        )
        return 0

    mid = len(question_ids) // 2
    halves = [question_ids[:mid], question_ids[mid:]]
    next_index_row = connection.execute(
        """
        SELECT COALESCE(MAX(chunk_index), -1) + 1 AS next_index
        FROM attempt_grading_batches
        WHERE attempt_id = %s
        """,
        [batch["attempt_id"]],
    ).fetchone()
    next_index = int(next_index_row["next_index"])

    split_note = (
        f"Split into 2 half-batches after failure (was {len(question_ids)} questions): "
        f"{error}"
    )[:2000]
    connection.execute(
        """
        UPDATE attempt_grading_batches
        SET status = 'failed', error_message = %s, completed_at = now()
        WHERE id = %s
        """,
        [split_note, batch["id"]],
    )

    for offset, half_ids in enumerate(halves):
        connection.execute(
            """
            INSERT INTO attempt_grading_batches (attempt_id, chunk_index, question_ids)
            VALUES (%s, %s, %s::uuid[])
            """,
            [batch["attempt_id"], next_index + offset, half_ids],
        )
    return 2


def process_next_grading_batch():
    with get_connection() as connection:
        batch = claim_next_grading_batch(connection)
        connection.commit()
    if not batch:
        return False

    n_ids = len(list(batch.get("question_ids") or []))
    print(
        f"Grading batch {batch['id']}: claimed "
        f"({n_ids} question(s), attempt {batch['attempt_id']})"
    )

    try:
        with get_connection() as connection:
            rows = _load_batch_questions(connection, batch)
            if not rows:
                connection.execute(
                    "UPDATE attempt_grading_batches SET status = 'completed', completed_at = now() WHERE id = %s",
                    [batch["id"]],
                )
                connection.commit()
                print(
                    f"Grading batch {batch['id']}: completed "
                    f"(no pending answers left to grade)"
                )
                return True

        provider = get_provider()
        if provider is None:
            raise RuntimeError("AI grading is unavailable because AI_PROVIDER is disabled")
        if not hasattr(provider, "generate_grading_json"):
            raise RuntimeError(
                "AI provider is missing generate_grading_json — "
                "deploy gemini_provider.py / openai_provider.py from the fix zip"
            )
        plans = [_plan_row(row) for row in rows]
        payload = extract_json_payload(
            provider.generate_grading_json(
                GRADING_SYSTEM_PROMPT, _build_prompt(rows, plans)
            )
        )
        grades = payload.get("grades") if isinstance(payload, dict) else None
        if not isinstance(grades, list):
            raise ValueError("AI grading response did not contain grades")
        by_index = {item.get("question_index"): item for item in grades if isinstance(item, dict)}
        if set(by_index) != set(range(len(rows))):
            raise ValueError("AI grading response did not grade every question in the batch")

        with get_connection() as connection:
            for index, row in enumerate(rows):
                grade = by_index[index]
                percentage, reasoning = _resolve_grade(plans[index], grade)
                maximum = plans[index]["maximum"]
                suggested_marks = round(maximum * percentage / 100, 2)
                connection.execute(
                    """
                    UPDATE exam_answers
                    SET grading_status = 'ai_graded',
                        ai_suggested_marks = %s,
                        ai_rubric_breakdown = %s::jsonb,
                        ai_reasoning = %s,
                        marks_awarded = %s,
                        is_correct = CASE WHEN %s >= 99.999 THEN TRUE ELSE FALSE END
                    WHERE attempt_id = %s AND question_id = %s
                    """,
                    [
                        suggested_marks,
                        json.dumps(grade.get("points_hit") or []),
                        reasoning,
                        suggested_marks,
                        percentage,
                        batch["attempt_id"],
                        row["question_id"],
                    ],
                )
            connection.execute(
                "UPDATE attempt_grading_batches SET status = 'completed', completed_at = now(), error_message = NULL WHERE id = %s",
                [batch["id"]],
            )
            _recompute_attempt(connection, batch["attempt_id"])
            connection.commit()
        print(f"Grading batch {batch['id']}: completed ({len(rows)} question(s) graded)")
    except Exception as error:
        try:
            with get_connection() as connection:
                halves = _split_failed_batch_into_halves(connection, batch, error)
                connection.commit()
            if halves:
                print(
                    f"Grading batch {batch['id']} failed ({error}); "
                    f"split into {halves} smaller queued batches"
                )
            else:
                print(f"Grading batch {batch['id']} failed: {error}")
        except Exception as split_error:
            print(
                f"Grading batch {batch['id']} failed: {error}; "
                f"and split/mark-failed also failed: {split_error}"
            )
    return True