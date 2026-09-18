"""Asynchronous rubric grading for submitted written answers.

Each database batch belongs to exactly one attempt and contains at most 12
question ids. This keeps the AI request bounded, lets a malformed response be
retried for just that batch, and never mixes answers from different students.
"""

import json

from .ai import get_provider
from .ai.schemas import extract_json_payload
from .db import get_connection


GRADING_SYSTEM_PROMPT = """
You grade written exam answers using only the supplied rubric or model answer.
Return JSON only: {"grades":[{"question_index":0,"points_hit":["..."],
"percentage":0-100,"reasoning":"brief explanation"}]}. Grade each listed
question independently. Award partial credit only for demonstrated rubric
points. Never invent facts or penalize a correct paraphrase merely because its
wording differs from the model answer.
""".strip()


def claim_next_grading_batch(connection):
    with connection.transaction():
        batch = connection.execute(
            """
            SELECT * FROM attempt_grading_batches
            WHERE status IN ('queued', 'failed')
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
          q.question_text, q.grading_rubric, q.expected_answer,
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


def _build_prompt(rows):
    questions = []
    for index, row in enumerate(rows):
        questions.append(
            {
                "question_index": index,
                "question": row["question_text"],
                "rubric": row["grading_rubric"],
                "expected_answer": row["expected_answer"],
                "student_answer": row["answer_text"],
                "maximum_marks": float(row["marks_per_correct"] or row["default_marks"] or 0),
            }
        )
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


def process_next_grading_batch():
    with get_connection() as connection:
        batch = claim_next_grading_batch(connection)
        connection.commit()
    if not batch:
        return False

    try:
        with get_connection() as connection:
            rows = _load_batch_questions(connection, batch)
            if not rows:
                connection.execute(
                    "UPDATE attempt_grading_batches SET status = 'completed', completed_at = now() WHERE id = %s",
                    [batch["id"]],
                )
                connection.commit()
                return True

        provider = get_provider()
        if provider is None:
            raise RuntimeError("AI grading is unavailable because AI_PROVIDER is disabled")
        payload = extract_json_payload(provider.generate_json(GRADING_SYSTEM_PROMPT, _build_prompt(rows)))
        grades = payload.get("grades") if isinstance(payload, dict) else None
        if not isinstance(grades, list):
            raise ValueError("AI grading response did not contain grades")
        by_index = {item.get("question_index"): item for item in grades if isinstance(item, dict)}
        if set(by_index) != set(range(len(rows))):
            raise ValueError("AI grading response did not grade every question in the batch")

        with get_connection() as connection:
            for index, row in enumerate(rows):
                grade = by_index[index]
                percentage = max(0, min(100, float(grade.get("percentage", 0))))
                maximum = float(row["marks_per_correct"] or row["default_marks"] or 0)
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
                        str(grade.get("reasoning") or "").strip() or None,
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
    except Exception as error:
        with get_connection() as connection:
            connection.execute(
                "UPDATE attempt_grading_batches SET status = 'failed', error_message = %s WHERE id = %s",
                [str(error)[:2000], batch["id"]],
            )
            connection.commit()
        print(f"Grading batch {batch['id']} failed: {error}")
    return True
