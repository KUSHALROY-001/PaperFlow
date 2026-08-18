import json
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from .asset_extractor import (
    build_diagram_original_storage_path,
    build_diagram_storage_path,
)
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


# A 'running' job whose updated_at hasn't moved in this long is treated as
# orphaned (worker crashed or was interrupted mid-job) and becomes eligible
# for another worker to reclaim it. See migration 005 for why this needs a
# bounded retry_count rather than reclaiming indefinitely.
STALE_JOB_THRESHOLD = "15 minutes"
MAX_JOB_RETRIES = 2


def claim_next_job(connection):
    with connection.transaction():
        # A job that's already been reclaimed MAX_JOB_RETRIES times and is
        # stale again has proven it can't complete - stop retrying it and
        # mark it failed outright, so a job that reliably crashes the
        # worker can't loop through reclaim attempts forever.
        failed_stale_rows = connection.execute(
            """
            UPDATE processing_jobs
            SET status = 'failed',
                current_stage = 'Failed (exceeded retry limit after being reclaimed)',
                error_message = COALESCE(
                    error_message,
                    'Job was orphaned (worker crashed/interrupted) and exceeded the retry limit'
                ),
                completed_at = COALESCE(completed_at, now())
            WHERE status = 'running'
              AND updated_at < now() - (%s)::interval
              AND retry_count >= %s
            RETURNING id
            """,
            [STALE_JOB_THRESHOLD, MAX_JOB_RETRIES],
        ).fetchall()

        for failed_row in failed_stale_rows:
            add_job_event(
                connection,
                failed_row["id"],
                "failed",
                "Job exceeded retry limit after being reclaimed too many times - marked failed",
            )

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
               OR (pj.status = 'running' AND pj.updated_at < now() - (%s)::interval)
            ORDER BY pj.created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """,
            [STALE_JOB_THRESHOLD],
        ).fetchone()

        if not row:
            return None

        is_reclaim = row["status"] == "running"

        updated = connection.execute(
            """
            UPDATE processing_jobs
            SET status = 'running',
                current_stage = 'Claimed by OCR worker',
                progress_percent = 5,
                started_at = COALESCE(started_at, now()),
                retry_count = retry_count + %s
            WHERE id = %s
            RETURNING *
            """,
            [1 if is_reclaim else 0, row["id"]],
        ).fetchone()

        add_job_event(
            connection,
            row["id"],
            "running",
            "OCR worker reclaimed a stale/orphaned job" if is_reclaim else "OCR worker claimed job",
            {"originalFilename": row["original_filename"], "reclaimed": is_reclaim},
        )

        return {**row, **updated}


class JobCancelled(BaseException):
    """Raised when a job this worker is mid-way through has been cancelled
    out from under it - see is_job_cancelled below. This is a BaseException
    (not Exception) so it passes straight through the `except Exception:
    pass` progress-reporting guard in ai/provider.py#report instead of being
    silently swallowed there, the same way KeyboardInterrupt/SystemExit are
    deliberately not caught by a bare `except Exception` elsewhere in this
    worker."""


def is_job_cancelled(connection, job_id):
    # Cheap checkpoint called between processing stages (and once per AI
    # chunk - see worker.py#report_ai_progress) so a job the Node backend
    # has superseded (mock-tests.repository.js#cancelActiveProcessingJobs)
    # gets noticed and abandoned within roughly one stage/chunk of that
    # happening, instead of running all the way to completion and then
    # overwriting whatever the newer job already wrote.
    row = connection.execute(
        "SELECT status FROM processing_jobs WHERE id = %s",
        [job_id],
    ).fetchone()
    return row is not None and row["status"] == "cancelled"


def update_job(connection, job_id, *, status=None, stage=None, progress=None, summary=None, error=None):
    # AND status <> 'cancelled' below is the actual guard: without it, a
    # worker process still mid-flight on a job the Node backend already
    # cancelled (e.g. because the user hit "reprocess" again) would write
    # status='running' right back over 'cancelled' on its very next
    # progress checkpoint, resurrecting a job that's supposed to be dead.
    # The is_job_cancelled() checks elsewhere in this module are what
    # actually stop the wasted work; this is the last-line backstop that
    # makes the cancellation itself impossible to undo by accident.
    cursor = connection.execute(
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
          AND status <> 'cancelled'
        RETURNING id
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

    if cursor.fetchone() is None:
        # Job was already cancelled - nothing was written, so don't log a
        # progress event that would misleadingly suggest this update
        # actually happened.
        return

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


def replace_questions(connection, *, workspace_id, mock_test_id, questions, pdf_path=None):
    existing = connection.execute(
        "SELECT id FROM questions WHERE mock_test_id = %s",
        [mock_test_id],
    ).fetchall()

    for row in existing:
        connection.execute("DELETE FROM questions WHERE id = %s", [row["id"]])

    inserted_count = 0
    # (storage_path, png_bytes) pairs to actually write to disk - deferred
    # until AFTER the caller's transaction commits (see worker.py), so a
    # rolled-back transaction never leaves an orphaned PNG file on disk
    # referencing a question row that doesn't exist. The question_assets
    # DB row itself IS inserted now, inside the transaction, since
    # inserting it doesn't require the file to exist yet - only serving it
    # later does.
    #
    # NOTE: since the manual-crop feature, this list holds TWO entries per
    # diagram (storage_path and its original_storage_path sibling - see
    # asset_extractor.py#build_diagram_original_storage_path), so
    # len(pending_diagram_writes) is a file-write count, not a diagram
    # count. diagrams_extracted_count below tracks the latter explicitly,
    # for worker.py's job summary.
    pending_diagram_writes = []
    diagrams_extracted_count = 0

    for question in questions:
        # question_type used to be hardcoded to 'single' here regardless of
        # how many correct answers the parser/AI actually found, which
        # mislabeled every multi-answer question. Derive it from the data.
        correct_option_indexes = question["correct_option_indexes"]
        question_type = question.get("question_type") or (
            "multi" if len(correct_option_indexes) > 1 else "single"
        )

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
              metadata,
              marks_per_correct,
              negative_marks_per_wrong,
              has_code,
              code_language,
              code_snippet
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'needs_review', %s, %s, %s, %s, %s, %s)
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
                question_type,
                correct_option_indexes,
                question.get("source_page"),
                question.get("confidence", 60),
                json.dumps(question.get("metadata", {})),
                # Set only when ai/provider.py#_apply_section_marks matched
                # this question's topic to a template section carrying its
                # own marking override - None (-> SQL NULL) otherwise,
                # which is exactly the "no override, fall back to the mock
                # test's own marks_per_correct/negative_marks_per_wrong"
                # state attempts.service.js's scoring already expects (both
                # columns are nullable for precisely this reason - the
                # question editor has always been able to set them by hand
                # per-question, same columns, same fallback rule).
                question.get("marks_per_correct"),
                question.get("negative_marks_per_wrong"),
                # has_code/code_language: set by ai/schemas.py's per-question
                # normalization (same has_diagram-shaped pattern) once
                # reconcile.py carries them through to the final merged
                # question dict. bool(...) rather than a bare .get() because
                # the regex-only fallback path (when every AI attempt fails)
                # never sets "has_code" at all - the column is NOT NULL, so
                # this needs a real False, not None, for that path.
                bool(question.get("has_code", False)),
                question.get("code_language"),
                question.get("code_snippet"),
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

        # _diagram_crop_bytes is an in-memory-only carrier attached by
        # ai/provider.py#_attach_diagram_crops - never a real question
        # field, and never written into `questions.metadata` above (it's
        # read via .get() here, not part of the dict passed to json.dumps
        # for metadata).
        crop_bytes = question.get("_diagram_crop_bytes")
        if crop_bytes and pdf_path:
            storage_path = build_diagram_storage_path(pdf_path, question_row["id"])
            # Immutable "pristine oversized crop" sibling - see its
            # docstring in asset_extractor.py. Written from the same
            # crop_bytes as storage_path below (there's only one crop
            # produced per diagram today), but kept as a genuinely
            # separate file on disk - not a symlink or DB-only alias -
            # so a later manual crop can overwrite storage_path without
            # ever touching this one.
            original_storage_path = build_diagram_original_storage_path(
                pdf_path, question_row["id"]
            )
            connection.execute(
                """
                INSERT INTO question_assets
                    (question_id, asset_type, storage_path, original_storage_path, page_number)
                VALUES (%s, 'diagram', %s, %s, %s)
                """,
                [
                    question_row["id"],
                    str(storage_path),
                    str(original_storage_path),
                    question.get("source_page"),
                ],
            )
            # has_manual_crop is left at its column default (false) -
            # correct for every freshly-extracted diagram, since no
            # manual crop has happened yet.
            pending_diagram_writes.append({"storage_path": storage_path, "png_bytes": crop_bytes})
            pending_diagram_writes.append(
                {"storage_path": original_storage_path, "png_bytes": crop_bytes}
            )
            diagrams_extracted_count += 1

        inserted_count += 1

    return inserted_count, pending_diagram_writes, diagrams_extracted_count


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