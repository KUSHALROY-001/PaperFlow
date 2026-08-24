import json
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from .asset_extractor import build_diagram_storage_path
from .config import DATABASE_URL, DB_CA_CERT_PATH


@contextmanager
def get_connection():
    # verify-full (not the libpq default of "prefer") means this actually
    # checks the server cert against DB_CA_CERT_PATH, matching what
    # src/db/pool.js does for the Node backend - without this, the
    # connection is encrypted but not authenticated, which is enough for a
    # network MITM to succeed against.
    connect_kwargs = {}
    if DB_CA_CERT_PATH:
        connect_kwargs["sslmode"] = "verify-full"
        connect_kwargs["sslrootcert"] = DB_CA_CERT_PATH

    with psycopg.connect(
        DATABASE_URL, row_factory=dict_row, **connect_kwargs
    ) as connection:
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
    # questions is a read-only compatibility view as of migration 030 -
    # both the SELECT and DELETE below now target question_slots (the
    # physical table) directly. content_id is captured alongside id so
    # the content rows those slots pointed at can be reclaimed right
    # after, if nothing else still references them - without this, every
    # re-process of a mock test (this function's very reason for
    # existing) would leave the OLD extraction's content rows behind as
    # dead weight forever, which is exactly the redundancy this migration
    # was built to eliminate.
    existing = connection.execute(
        "SELECT id, content_id FROM question_slots WHERE mock_test_id = %s",
        [mock_test_id],
    ).fetchall()

    existing_content_ids = [row["content_id"] for row in existing]

    for row in existing:
        connection.execute("DELETE FROM question_slots WHERE id = %s", [row["id"]])

    if existing_content_ids:
        # NOT EXISTS guard: a content row is only reclaimed if the slot
        # deletes above were genuinely its last reference - if some OTHER
        # mock test's slot still shares this content (via a duplicate
        # merge or a Question Bank copy), it survives untouched, same as
        # duplicates.repository.js#deleteOrphanedContent's identical
        # guard for the merge-resolution path.
        connection.execute(
            """
            DELETE FROM question_contents
            WHERE id = ANY(%s::uuid[])
              AND NOT EXISTS (
                SELECT 1 FROM question_slots WHERE content_id = question_contents.id
              )
            """,
            [existing_content_ids],
        )

    inserted_count = 0
    # (storage_path, png_bytes) pairs to actually write to disk - deferred
    # until AFTER the caller's transaction commits (see worker.py), so a
    # rolled-back transaction never leaves an orphaned PNG file on disk
    # referencing a question row that doesn't exist. The question_assets
    # DB row itself IS inserted now, inside the transaction, since
    # inserting it doesn't require the file to exist yet - only serving it
    # later does.
    #
    # One entry per diagram (see migration 022_diagram_single_image.sql,
    # reversing the manual-crop feature's earlier two-file-per-diagram
    # design) - len(pending_diagram_writes) is a diagram count again, not
    # a file-write count.
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

        content_row = connection.execute(
            """
            INSERT INTO question_contents (
              workspace_id,
              topic,
              question_text,
              subtopic,
              passage,
              explanation,
              question_type,
              correct_option_indexes,
              metadata,
              options,
              marks_per_correct,
              negative_marks_per_wrong
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            [
                workspace_id,
                question.get("topic"),
                question["text"],
                question.get("subtopic"),
                question.get("passage"),
                question.get("explanation"),
                question_type,
                correct_option_indexes,
                json.dumps(question.get("metadata", {})),
                json.dumps(question["options"]),
                question.get("marks_per_correct"),
                question.get("negative_marks_per_wrong"),
            ],
        ).fetchone()

        question_row = connection.execute(
            """
            INSERT INTO question_slots (
              workspace_id,
              mock_test_id,
              question_no,
              source_page,
              confidence,
              status,
              content_id
            )
            VALUES (%s, %s, %s, %s, %s, 'needs_review', %s)
            RETURNING id
            """,
            [
                workspace_id,
                mock_test_id,
                question["question_no"],
                question.get("source_page"),
                question.get("confidence", 60),
                content_row["id"],
            ],
        ).fetchone()

        # _diagram_crop_bytes is an in-memory-only carrier attached by
        # ai/provider.py#_attach_diagram_crops - never a real question
        # field, and never written into `questions.metadata` above (it's
        # read via .get() here, not part of the dict passed to json.dumps
        # for metadata).
        crop_bytes = question.get("_diagram_crop_bytes")
        if crop_bytes and pdf_path:
            storage_path = build_diagram_storage_path(pdf_path, question_row["id"])
            connection.execute(
                """
                INSERT INTO question_assets
                    (question_id, asset_type, storage_path, page_number)
                VALUES (%s, 'diagram', %s, %s)
                """,
                [
                    question_row["id"],
                    str(storage_path),
                    question.get("source_page"),
                ],
            )
            pending_diagram_writes.append({"storage_path": storage_path, "png_bytes": crop_bytes})
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


# Finds this job's OWN slots that a fresh detect_duplicates_for_mock_test
# pass just flagged as a near-duplicate of something already in the
# workspace, at or above AI_DUPLICATE_REGEN_THRESHOLD - see
# worker.py#regenerate_flagged_duplicates_for_mock_test, which uses this to
# drive a single bounded AI regeneration pass rather than leaving every
# flagged question sitting in the review queue.
#
# question_duplicate_pairs.question_id_a/b are both SLOT ids (see
# migrations/030 - the FK originally pointed at `questions` back when that
# was still the real table, and survived the rename), and the table's own
# CHECK (question_id_a < question_id_b) constraint means there's no
# "always side a is the new one" shortcut - either side, or both, could
# belong to this job's mock test. When BOTH sides do (this job's own
# output duplicating itself within the same generation), only question_id_b
# is flagged - the a-side is left untouched as the "original", keeping
# exactly one side of any self-duplicate pair stable rather than
# regenerating both and risking a fresh pair between two brand-new
# question_id_bs.
def find_flagged_duplicate_slots(connection, workspace_id, mock_test_id, threshold):
    pairs = connection.execute(
        """
        SELECT
          qdp.id AS pair_id,
          qdp.question_id_a,
          qdp.question_id_b,
          qdp.similarity_score,
          sa.mock_test_id AS a_mock_test_id,
          sb.mock_test_id AS b_mock_test_id
        FROM question_duplicate_pairs qdp
        JOIN question_slots sa ON sa.id = qdp.question_id_a
        JOIN question_slots sb ON sb.id = qdp.question_id_b
        WHERE qdp.workspace_id = %s
          AND qdp.status = 'pending'
          AND qdp.similarity_score >= %s
          AND (sa.mock_test_id = %s OR sb.mock_test_id = %s)
        """,
        [workspace_id, threshold, mock_test_id, mock_test_id],
    ).fetchall()

    # slot_id -> {pair_id, other_slot_id, similarity_score} - a slot could
    # in principle appear in more than one flagged pair; last one wins,
    # which is fine, this only needs ONE example of what to differentiate
    # from, not an exhaustive list.
    flagged = {}
    for pair in pairs:
        b_is_this_test = pair["b_mock_test_id"] == mock_test_id
        # Covers both "only b belongs to this test" and "both a and b
        # belong to this test" (self-duplicate within this generation) -
        # b is flagged in either case; a is only ever flagged when b
        # does NOT belong to this test (the SQL's own WHERE clause
        # guarantees at least one side does, so "b doesn't" implies "a
        # does").
        if b_is_this_test:
            flag_slot_id, other_slot_id = pair["question_id_b"], pair["question_id_a"]
        else:
            flag_slot_id, other_slot_id = pair["question_id_a"], pair["question_id_b"]

        flagged[flag_slot_id] = {
            "pair_id": pair["pair_id"],
            "other_slot_id": other_slot_id,
            "similarity_score": float(pair["similarity_score"]),
        }

    if not flagged:
        return []

    slot_ids = list(flagged.keys())
    other_ids = [info["other_slot_id"] for info in flagged.values()]
    all_ids = list(set(slot_ids) | set(other_ids))

    rows = connection.execute(
        """
        SELECT id, topic, subtopic, question_type, text AS question_text
        FROM questions
        WHERE id = ANY(%s::uuid[])
        """,
        [all_ids],
    ).fetchall()
    text_by_id = {row["id"]: row for row in rows}

    result = []
    for slot_id, info in flagged.items():
        own = text_by_id.get(slot_id)
        other = text_by_id.get(info["other_slot_id"])
        if not own or not other:
            # One side vanished since detection ran a moment ago (e.g. an
            # earlier flagged slot in this same pass already got
            # repointed/replaced) - skip rather than regenerate against
            # stale data.
            continue
        result.append(
            {
                "slot_id": slot_id,
                "pair_id": info["pair_id"],
                "similarity_score": info["similarity_score"],
                "topic": own["topic"],
                "subtopic": own["subtopic"],
                "question_type": own["question_type"],
                "own_text": own["question_text"],
                "other_text": other["question_text"],
            }
        )
    return result


# Overwrites a slot's question with freshly-regenerated content - always
# through the same fork-if-shared safety check questions.service.js#
# updateQuestion already uses for a human-driven edit, even though a slot
# reaching here was only just inserted by THIS job and is overwhelmingly
# likely to be exclusively its own: the auto-merge pass that already ran
# earlier in this same pipeline (see worker.py#process_generation_job)
# could in principle have just repointed some OTHER slot onto this exact
# content_id moments ago, and mutating a shared row in place would corrupt
# whatever mock test that other slot belongs to. If content_id is
# exclusive, updated in place (cheapest, and no orphaned row left behind).
# If shared, a fresh content row is inserted and only THIS slot is
# repointed to it - the shared original is never touched.
def replace_slot_content(connection, workspace_id, slot_id, new_question):
    slot = connection.execute(
        "SELECT content_id FROM question_slots WHERE id = %s AND workspace_id = %s",
        [slot_id, workspace_id],
    ).fetchone()
    if not slot:
        return False

    sharers = connection.execute(
        "SELECT count(*) AS n FROM question_slots WHERE content_id = %s",
        [slot["content_id"]],
    ).fetchone()

    correct_option_indexes = new_question["correct_option_indexes"]
    # Same fallback replace_questions itself uses (see the comment on
    # question_type there) rather than assuming the caller always sets it
    # explicitly - defensive consistency, not a guess: a question_type
    # derived from actual correct_option_indexes length can never disagree
    # with what's stored, even if some future caller forgets to set it.
    question_type = new_question.get("question_type") or (
        "multi" if len(correct_option_indexes) > 1 else "single"
    )
    fields = (
        new_question["topic"],
        new_question.get("subtopic"),
        new_question["text"],
        new_question.get("explanation"),
        json.dumps(new_question["options"]),
        correct_option_indexes,
        new_question.get("marks_per_correct"),
        new_question.get("negative_marks_per_wrong"),
        json.dumps(new_question.get("metadata", {})),
    )

    if sharers["n"] <= 1:
        connection.execute(
            """
            UPDATE question_contents
            SET topic = %s, subtopic = %s, question_text = %s, explanation = %s,
                options = %s, correct_option_indexes = %s::int[],
                marks_per_correct = %s, negative_marks_per_wrong = %s, metadata = %s
            WHERE id = %s
            """,
            [*fields, slot["content_id"]],
        )
    else:
        new_content = connection.execute(
            """
            INSERT INTO question_contents (
              workspace_id, topic, subtopic, question_text, explanation,
              options, correct_option_indexes, marks_per_correct,
              negative_marks_per_wrong, metadata, question_type
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::int[], %s, %s, %s, %s)
            RETURNING id
            """,
            [workspace_id, *fields, question_type],
        ).fetchone()
        connection.execute(
            "UPDATE question_slots SET content_id = %s WHERE id = %s",
            [new_content["id"], slot_id],
        )
        # The old content row is now down to (sharers - 1) references -
        # only reclaim it if this slot really was its last one, same
        # NOT EXISTS guard duplicates.repository.js#deleteOrphanedContent
        # and duplicate_detector.py's own merge path both already use.
        connection.execute(
            """
            DELETE FROM question_contents
            WHERE id = %s
              AND NOT EXISTS (
                SELECT 1 FROM question_slots WHERE content_id = %s
              )
            """,
            [slot["content_id"], slot["content_id"]],
        )
    return True


# Marks a flagged pair 'confirmed' (system-resolved, resolved_by stays
# NULL) once its slot has been successfully regenerated - same status a
# human clicking "merge" or the exact-duplicate auto-merge path already
# produces (see duplicates.repository.js#resolveDuplicatePair and
# duplicate_detector.py#_merge_pair), since a regeneration is the same
# kind of "yes, this was a real duplicate, and it's been resolved" outcome,
# just via rewriting one side apart instead of merging them into one.
# Deliberately NOT deleted outright - keeps the same audit trail every
# other resolution path already leaves behind.
def resolve_regenerated_duplicate_pair(connection, pair_id):
    connection.execute(
        """
        UPDATE question_duplicate_pairs
        SET status = 'confirmed', resolved_at = now(), resolved_by = NULL
        WHERE id = %s
        """,
        [pair_id],
    )