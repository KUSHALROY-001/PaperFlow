"""Reading and writing extracted/generated questions: batch insert
(including the math-error check every question gets before it's saved),
the streaming upsert variant, the atomic-replace wrapper, and the
bookkeeping that goes with a reprocess (which question numbers survived,
which got orphaned) and its effect on mock_tests.status. Split out of
db.py - see backend/worker/ARCHITECTURE.md.
"""

import json

from ..cloudinary_storage import build_diagram_public_id
from ..math_validator import find_all_math_errors

# Well below any confidence score the AI itself reports (question.get
# ("confidence", 60) below defaults to 60, and real extraction confidence
# realistically ranges roughly 50-95) - guarantees a question with broken
# math sorts to the very top of the Review Queue (already sorted
# lowest-confidence-first) regardless of how confident the AI otherwise
# was about everything else on that question. Not 0: reserved in case a
# genuinely-worse signal ever needs to sort even lower than this.
MATH_ERROR_CONFIDENCE = 5


# Split out of replace_questions so the delete-then-insert sequence no
# longer has to happen inside ONE transaction. worker.py now runs this
# once up front (its own short transaction), then streams the new
# questions in via insert_question_batch in batches of
# QUESTION_WRITE_BATCH_SIZE - see config.py#QUESTION_WRITE_BATCH_SIZE for
# why the single-transaction version could not survive a 3000-question
# paper. Callers that genuinely want the old all-or-nothing behaviour
# (process_generation_job, whose question counts are bounded by a target
# the user picked) still get it from replace_questions below, unchanged.
def delete_existing_questions(connection, mock_test_id):
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

    return len(existing)


# The insert half of the old replace_questions, over an arbitrary slice of
# the question list rather than all of it. Deliberately takes no
# responsibility for transactions: the caller decides whether this batch
# is its own transaction (worker.py#process_job, so a 3000-question paper
# commits in 100 short transactions) or one of many inside a larger one
# (replace_questions below).
#
# pending_diagram_writes is returned PER CALL, so the caller can upload
# and drop this batch's PNG bytes before the next batch is even parsed -
# the single biggest source of the memory growth that made large papers
# fail, since previously every diagram crop in the document stayed
# resident until the one giant transaction committed.
def insert_question_batch(connection, *, workspace_id, mock_test_id, questions):
    inserted_count = 0
    # (public_id, png_bytes) pairs to actually upload to Cloudinary -
    # deferred until AFTER the caller's transaction commits (see
    # worker.py), so a rolled-back transaction never leaves an orphaned
    # Cloudinary asset referencing a question row that doesn't exist. The
    # question_assets DB row itself IS inserted now, inside the
    # transaction, since inserting it doesn't require the upload to have
    # happened yet - only serving it later does (and public_id, unlike a
    # random Cloudinary-assigned id, is knowable up front - see
    # asset_extractor.py#build_diagram_public_id).
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
        correct_option_indexes = question.get("correct_option_indexes") or []
        question_type = question.get("question_type") or (
            "multi" if len(correct_option_indexes) > 1 else "single"
        )

        # Checks every $...$/$$...$$ span across text/explanation/passage/
        # options for a balanced-brace LaTeX error BEFORE this question is
        # ever saved - the alternative is what happened before this
        # existed: broken math sat silently in the database, indistinguishable
        # from every other "needs_review" question, until a human happened
        # to open that specific one and notice red text in the Live
        # Preview. Recording the actual error(s) in metadata, not just
        # dropping confidence silently, means a reviewer opening the
        # Review Queue sees WHY it's flagged instead of having to
        # re-discover it themselves.
        math_errors = find_all_math_errors(question)
        if math_errors:
            question.setdefault("metadata", {})["mathErrors"] = math_errors
            question["confidence"] = MATH_ERROR_CONFIDENCE

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
              negative_marks_per_wrong,
              accepted_answers,
              grading_rubric,
              expected_answer,
              answer_word_limit,
              numeric_answer,
              numeric_tolerance
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                json.dumps(question.get("accepted_answers")) if question.get("accepted_answers") is not None else None,
                json.dumps(question.get("grading_rubric")) if question.get("grading_rubric") is not None else None,
                question.get("expected_answer"),
                question.get("answer_word_limit"),
                question.get("numeric_answer"),
                question.get("numeric_tolerance"),
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

        # _diagram_crops is transient in-memory data keyed by image slot.
        # It is deliberately excluded from question metadata and uploaded
        # only after this transaction commits in worker.py.
        crops = question.get("_diagram_crops") or {}
        for slot_key, crop_bytes in crops.items():
            public_id = build_diagram_public_id(
                workspace_id, mock_test_id, question_row["id"], slot_key
            )
            connection.execute(
                """
                INSERT INTO question_assets
                    (question_id, slot_key, asset_type, storage_path, page_number)
                VALUES (%s, %s, 'diagram', %s, %s)
                ON CONFLICT (question_id, slot_key) DO UPDATE
                  SET storage_path = EXCLUDED.storage_path,
                      page_number = EXCLUDED.page_number
                """,
                [
                    question_row["id"],
                    slot_key,
                    public_id,
                    question.get("source_page"),
                ],
            )
            pending_diagram_writes.append({"public_id": public_id, "png_bytes": crop_bytes})
            diagrams_extracted_count += 1

        inserted_count += 1

    return inserted_count, pending_diagram_writes, diagrams_extracted_count


def upsert_question_batch(connection, *, workspace_id, mock_test_id, questions):
    """Replace only the slots represented by this incremental AI result.

    Vision chunks can overlap at a page boundary. A later chunk is allowed
    to provide a better version of an already-published question number, so
    the streaming worker must replace that one slot instead of attempting a
    second INSERT against the mock-test/question-number uniqueness rule.
    """
    question_numbers = [question["question_no"] for question in questions]
    existing = connection.execute(
        """
        SELECT id, content_id FROM question_slots
        WHERE mock_test_id = %s AND question_no = ANY(%s::int[])
        """,
        [mock_test_id, question_numbers],
    ).fetchall()

    for row in existing:
        connection.execute("DELETE FROM question_slots WHERE id = %s", [row["id"]])
        connection.execute(
            """
            DELETE FROM question_contents
            WHERE id = %s
              AND NOT EXISTS (
                SELECT 1 FROM question_slots WHERE content_id = %s
              )
            """,
            [row["content_id"], row["content_id"]],
        )

    return insert_question_batch(
        connection,
        workspace_id=workspace_id,
        mock_test_id=mock_test_id,
        questions=questions,
    )


# Backwards-compatible wrapper with the original signature and the
# original semantics: one delete + every insert, all inside whatever
# transaction the caller has open. Still used by
# worker.py#process_generation_job (no PDF, no diagram crops, question
# count bounded by the user's requested target) and by anything else that
# wants "replace this mock test's questions atomically".
def replace_questions(connection, *, workspace_id, mock_test_id, questions, pdf_path=None):
    delete_existing_questions(connection, mock_test_id)
    return insert_question_batch(
        connection,
        workspace_id=workspace_id,
        mock_test_id=mock_test_id,
        questions=questions,
    )


# How many slots this mock test actually has right now. Used by worker.py
# when a batched save fails partway: the job is marked failed, but the
# mock test's status has to reflect the questions that DID commit (a
# partial extraction is still reviewable) rather than being forced back to
# 'draft' as if nothing had been saved.
def count_questions_for_mock_test(connection, mock_test_id):
    row = connection.execute(
        "SELECT COUNT(*)::int AS count FROM question_slots WHERE mock_test_id = %s",
        [mock_test_id],
    ).fetchone()
    return row["count"] if row else 0


# Snapshot of question_no values a mock test already has, taken once at
# the very start of a reprocess job - see worker.py#process_job. This
# replaced an upfront delete_existing_questions call that used to wipe
# every slot before the new extraction had produced a single replacement,
# which was the actual cause of "my questions vanish the instant I click
# reprocess, and a cancelled reprocess loses them permanently". Nothing is
# deleted here; this only remembers what existed so the job can later tell
# which of those question numbers this run's extraction never touched
# (see flag_orphaned_question_slots below) - upsert_question_batch
# already replaces a slot in place the moment its new content actually
# arrives, so no explicit "clear" step is needed at all.
def get_existing_question_numbers(connection, mock_test_id):
    rows = connection.execute(
        "SELECT question_no FROM question_slots WHERE mock_test_id = %s",
        [mock_test_id],
    ).fetchall()
    return {row["question_no"] for row in rows}


# Called once, only after a reprocess job has fully and successfully
# completed (never on a cancelled or failed run - an incomplete run hasn't
# earned the right to claim any question number is genuinely gone from the
# paper). pre_existing_question_numbers is this mock test's
# get_existing_question_numbers() snapshot from before the run started;
# touched_question_numbers is every question_no this run's final saved
# result actually covers. Anything in the former but not the latter is a
# slot the new extraction never reached or reproduced - flagged for a
# human to look at rather than silently kept forever or silently deleted
# (deleting risks throwing away a real question the new extraction simply
# missed; keeping it unflagged risks a stale question quietly surviving in
# a paper that no longer actually contains it).
#
# Deliberately skips already-'rejected' slots (a human already decided
# that one doesn't belong, so re-flagging it teaches nothing new) and
# never touches status on a slot it doesn't flag. Flips 'approved' back to
# 'needs_review' - an approval made against the PREVIOUS extraction's
# version of this slot doesn't carry over to "still approved even though
# the latest reprocess found no trace of it" - but leaves an
# already-needs_review slot's status alone (it was already going to
# surface in review; only the flags are new information here).
def flag_orphaned_question_slots(
    connection, mock_test_id, pre_existing_question_numbers, touched_question_numbers
):
    orphaned_numbers = pre_existing_question_numbers - touched_question_numbers
    if not orphaned_numbers:
        return 0

    rows = connection.execute(
        """
        UPDATE question_slots
        SET status = CASE WHEN status = 'approved' THEN 'needs_review' ELSE status END,
            review_flags = review_flags || %s::jsonb
        WHERE mock_test_id = %s
          AND question_no = ANY(%s::int[])
          AND status <> 'rejected'
        RETURNING id
        """,
        [
            json.dumps(
                {
                    "staleFromReprocess": True,
                    "staleReason": "Not found in the most recent reprocess of this PDF",
                }
            ),
            mock_test_id,
            sorted(orphaned_numbers),
        ],
    ).fetchall()
    return len(rows)


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
