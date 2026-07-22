import json
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from .config import DATABASE_URL


@contextmanager
def get_connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        yield connection


def add_job_event(connection, job_id, stage, message, payload=None):
    connection.execute(
        """
        INSERT INTO processing_job_events (job_id, stage, message, payload)
        VALUES (%s, %s, %s, %s)
        """,
        [job_id, stage, message, json.dumps(payload or {})],
    )


def claim_next_job(connection):
    with connection.transaction():
        row = connection.execute(
            """
            SELECT
              pj.*,
              uf.original_filename,
              uf.storage_key,
              uf.metadata AS uploaded_file_metadata
            FROM processing_jobs pj
            JOIN uploaded_files uf ON uf.id = pj.uploaded_file_id
            WHERE pj.status = 'queued'
            ORDER BY pj.created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        ).fetchone()

        if not row:
            return None

        updated = connection.execute(
            """
            UPDATE processing_jobs
            SET status = 'running',
                current_stage = 'Claimed by OCR worker',
                progress_percent = 5,
                started_at = COALESCE(started_at, now())
            WHERE id = %s
            RETURNING *
            """,
            [row["id"]],
        ).fetchone()

        add_job_event(
            connection,
            row["id"],
            "running",
            "OCR worker claimed job",
            {"originalFilename": row["original_filename"]},
        )

        return {**row, **updated}


def update_job(connection, job_id, *, status=None, stage=None, progress=None, summary=None, error=None):
    connection.execute(
        """
        UPDATE processing_jobs
        SET status = COALESCE(%s::processing_status, status),
            current_stage = COALESCE(%s, current_stage),
            progress_percent = COALESCE(%s, progress_percent),
            output_summary = COALESCE(%s, output_summary),
            error_message = %s,
            completed_at = CASE
              WHEN %s::processing_status IN ('completed', 'failed', 'cancelled')
              THEN COALESCE(completed_at, now())
              ELSE completed_at
            END
        WHERE id = %s
        """,
        [
            status,
            stage,
            progress,
            json.dumps(summary) if summary is not None else None,
            error,
            status,
            job_id,
        ],
    )

    add_job_event(
        connection,
        job_id,
        stage or status or "updated",
        error or f"Job updated: {stage or status}",
        {
            "status": status,
            "progress": progress,
            "summary": summary,
        },
    )


def replace_questions(connection, *, workspace_id, mock_test_id, questions):
    existing = connection.execute(
        "SELECT id FROM questions WHERE mock_test_id = %s",
        [mock_test_id],
    ).fetchall()

    for row in existing:
        connection.execute("DELETE FROM questions WHERE id = %s", [row["id"]])

    inserted_count = 0

    for question in questions:
        question_row = connection.execute(
            """
            INSERT INTO questions (
              workspace_id,
              mock_test_id,
              question_no,
              topic,
              question_text,
              subtopic,
              passage,
              explanation,
              question_type,
              correct_option_indexes,
              source_page,
              confidence,
              status,
              metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'single', %s, %s, %s, 'needs_review', %s)
            RETURNING id
            """,
            [
                workspace_id,
                mock_test_id,
                question["question_no"],
                question.get("topic"),
                question["text"],
                question.get("subtopic"),
                question.get("passage"),
                question.get("explanation"),
                question["correct_option_indexes"],
                question.get("source_page"),
                question.get("confidence", 60),
                json.dumps(question.get("metadata", {})),
            ],
        ).fetchone()

        for index, option in enumerate(question["options"]):
            connection.execute(
                """
                INSERT INTO question_options (question_id, option_index, option_text)
                VALUES (%s, %s, %s)
                """,
                [question_row["id"], index, option],
            )

        inserted_count += 1

    return inserted_count


def mark_mock_test_after_processing(connection, mock_test_id, question_count):
    next_status = "review" if question_count > 0 else "draft"
    connection.execute(
        """
        UPDATE mock_tests
        SET status = %s
        WHERE id = %s
        """,
        [next_status, mock_test_id],
    )
