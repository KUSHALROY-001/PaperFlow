"""question_duplicate_pairs bookkeeping: finding this job's flagged slots
(for ai/duplicate_regeneration.py to act on), overwriting a slot's content
after regeneration (fork-if-shared, same safety check a human-driven edit
uses), and clearing a pair once it no longer describes anything real.
Split out of db.py - see backend/worker/ARCHITECTURE.md.
"""

import json

# Finds this job's OWN slots that a fresh detect_duplicates_for_mock_test
# pass just flagged as a near-duplicate of something already in the
# workspace, at or above AI_DUPLICATE_REGEN_THRESHOLD - see
# worker.py#regenerate_flagged_duplicates_for_mock_test, which uses this to
# drive a single bounded AI regeneration pass. Every row returned here is
# "live" - there's no pending/resolved split on question_duplicate_pairs
# anymore, so nothing to filter by beyond similarity and mock test.
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


# Once a flagged pair's slot has been successfully regenerated, the two
# questions no longer match - the pair row doesn't describe anything real
# anymore, so it's deleted rather than status-flagged (there's no status
# column to flag it with; see migrations/045_remove_duplicate_pair_status.sql).
# A deleted row and a "resolved" row mean the same thing here: nothing
# left that needs surfacing in the duplicates report.
def delete_duplicate_pair(connection, pair_id):
    connection.execute(
        "DELETE FROM question_duplicate_pairs WHERE id = %s",
        [pair_id],
    )