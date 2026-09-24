"""processing_jobs lifecycle: claiming, cancellation checks, progress
updates, and the event log. Split out of db.py - see
backend/worker/ARCHITECTURE.md.
"""

import json

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
            LEFT JOIN uploaded_files uf ON uf.id = pj.uploaded_file_id
            WHERE pj.status = 'queued'
               OR (pj.status = 'running' AND pj.updated_at < now() - (%s)::interval)
            ORDER BY pj.created_at ASC
            FOR UPDATE OF pj SKIP LOCKED
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
    #
    # row is None means this exact case: the mock test was deleted while
    # this job was still mid-flight. deleteMockTest cancels active jobs
    # first, but the DELETE FROM mock_tests that follows it cascades
    # straight through processing_jobs (ON DELETE CASCADE, migration 001)
    # and removes this very row - it doesn't leave a status='cancelled'
    # row behind for us to find. A job whose row (and whose owning mock
    # test) no longer exists at all is at least as dead as one marked
    # 'cancelled', so treat a missing row the same way - otherwise this
    # returned False ("not cancelled, keep going"), and the worker ran a
    # deleted job through to completion: AI calls spent, and a guaranteed
    # later failure trying to write questions against a mock_test_id that
    # no longer exists.
    row = connection.execute(
        "SELECT status FROM processing_jobs WHERE id = %s",
        [job_id],
    ).fetchone()
    return row is None or row["status"] == "cancelled"


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
