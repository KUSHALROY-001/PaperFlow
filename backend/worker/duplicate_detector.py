"""Duplicate question detection (migrations/024_duplicate_detection.sql).

Entry points:

- detect_duplicates_for_mock_test(connection, workspace_id, mock_test_id)
  Incremental - compares only the questions belonging to ONE mock test
  (the one a processing job just finished inserting questions for)
  against every OTHER question in the workspace. Called from
  worker.py#process_job right after mark_mock_test_after_processing, so
  every newly-extracted question gets checked against the workspace's
  existing question bank without re-scanning the whole workspace on every
  single job.

- detect_duplicates_for_workspace(connection, workspace_id)
  Full pairwise scan across every question already in the workspace. Not
  called automatically - this is the one-time backfill for data that
  existed before this feature shipped, run manually via
  `python -m worker.duplicate_detector --workspace-id <uuid>` (or
  `--all` for every workspace). Safe to re-run: ON CONFLICT DO NOTHING
  means already-detected pairs (pending, confirmed, OR dismissed) are
  never re-inserted or reset.

- auto_merge_exact_duplicates_for_mock_test(connection, workspace_id, mock_test_id)
  Also called automatically from worker.py, immediately BEFORE the two
  functions above run for the same job. See its own docstring - this is
  the fix for a real false-positive the two functions above have always
  had: they only ever compared question_text, so two questions with
  identical wording but DIFFERENT options/answers score a 100% match and
  land in the review queue looking like a genuine duplicate. This
  function only acts when question_text, options, correct_option_indexes,
  AND question_type are all EXACTLY equal - not fuzzy-similar - and when
  that's true, it merges immediately rather than waiting for a reviewer,
  since there's no judgment call left to make.

Both detect_duplicates_for_* share _insert_candidate_pairs, which does the
actual similarity scoring + insert. threshold=0.55 is a deliberately
conservative starting point (see the implementation plan) - not a
validated number, just a reasonable "don't be noisy on day one" guess to
revisit once there's a real batch of results to look at.

All three exclude pairs whose two slots already share the same content_id
(migration 030) - once a merge (auto or manual) or a Question Bank copy
has repointed one slot's content onto another's, their question_text is
trivially identical (100% similarity) and re-flagging that as a "new"
duplicate on every subsequent run would just be pure noise, not a
genuine finding a reviewer needs to act on again.
"""

import argparse

from .db import get_connection

DEFAULT_THRESHOLD = 0.55

# question_type included even though it's not something a student directly
# sees - a 'single' vs 'multi' question with identical text/options would
# score their correct answers completely differently (one right index vs.
# several), so it's a real content difference, not cosmetic.
_EXACT_MATCH_QUERY = """
    SELECT a.id AS id_a, b.id AS id_b
    FROM questions a
    JOIN questions b
      ON a.workspace_id = b.workspace_id
     AND b.mock_test_id <> %(mock_test_id)s
     AND a.content_id <> b.content_id
     AND a.question_text = b.question_text
     AND a.options = b.options
     AND a.correct_option_indexes = b.correct_option_indexes
     AND a.question_type = b.question_type
    WHERE a.workspace_id = %(workspace_id)s
      AND a.mock_test_id = %(mock_test_id)s
"""


def _merge_pair(connection, workspace_id, slot_id_a, slot_id_b):
    """Repoints slot_id_b's content onto slot_id_a's, deletes slot_id_b's
    old content if nothing else references it, and records the pair as an
    already-resolved (status='confirmed') row - same shape a human
    clicking "merge" in the review UI produces
    (duplicates.repository.js#resolveDuplicatePair), just with
    resolved_by left NULL to mark it as system-resolved rather than
    attributed to a reviewer who never looked at it.

    Deliberately the same granularity as
    duplicates.repository.js#repointSlotContent: only slot_id_b moves,
    not every slot that happens to already share its content - merging
    one detected pair at a time is what the manual review flow does too,
    and staying consistent with it means a workspace with a long history
    of manual + automatic merges behaves the same way regardless of which
    kind resolved which pair.

    Returns True if a merge actually happened, False if there was nothing
    left to do (e.g. an earlier pair in this same batch already merged
    these two slots onto the same content).
    """
    id_a, id_b = slot_id_a, slot_id_b
    if id_a == id_b:
        return False
    pair_a, pair_b = (id_a, id_b) if id_a < id_b else (id_b, id_a)

    with connection.transaction():
        content_a = connection.execute(
            "SELECT content_id FROM question_slots WHERE id = %s AND workspace_id = %s",
            [slot_id_a, workspace_id],
        ).fetchone()
        content_b = connection.execute(
            "SELECT content_id FROM question_slots WHERE id = %s AND workspace_id = %s",
            [slot_id_b, workspace_id],
        ).fetchone()
        # Either slot could have been deleted/moved by something else
        # between detection and this transaction - skip rather than error,
        # same "best-effort" stance worker.py already takes around this
        # whole feature.
        if not content_a or not content_b:
            return False

        winner_content_id = content_a["content_id"]
        loser_content_id = content_b["content_id"]
        if winner_content_id == loser_content_id:
            return False  # already merged earlier in this same batch

        connection.execute(
            "UPDATE question_slots SET content_id = %s WHERE id = %s AND workspace_id = %s",
            [winner_content_id, slot_id_b, workspace_id],
        )
        connection.execute(
            """
            DELETE FROM question_contents
            WHERE id = %s
              AND NOT EXISTS (
                SELECT 1 FROM question_slots WHERE content_id = %s
              )
            """,
            [loser_content_id, loser_content_id],
        )
        # ON CONFLICT DO UPDATE, not DO NOTHING: this exact pair may
        # already be sitting in the table as 'pending' from an earlier,
        # options-blind detection run (the false positive this function
        # exists to fix) - this both records the merge AND clears that
        # stale pending entry out of the review queue in the same write,
        # rather than leaving a now-meaningless "review this" row behind
        # for something that no longer needs a human at all.
        connection.execute(
            """
            INSERT INTO question_duplicate_pairs
                (workspace_id, question_id_a, question_id_b, similarity_score, status, resolved_at)
            VALUES (%s, %s, %s, 1.0, 'confirmed', now())
            ON CONFLICT (question_id_a, question_id_b)
            DO UPDATE SET
              status = 'confirmed',
              resolved_at = now(),
              resolved_by = NULL
            """,
            [workspace_id, pair_a, pair_b],
        )
    return True


def auto_merge_exact_duplicates_for_mock_test(connection, workspace_id, mock_test_id):
    """Called from worker.py right after a job's questions are saved,
    BEFORE detect_duplicates_for_mock_test runs for the same job - so by
    the time the fuzzy check runs, an already-merged pair's two slots
    share one content_id and no longer satisfy that query's
    `a.content_id <> b.content_id` filter, meaning a genuine duplicate
    never even reaches the pending review queue in the first place.

    Only ever acts on EXACT matches (see _EXACT_MATCH_QUERY) - question
    text, options, correct answers, and question type all byte-identical.
    This is deliberately much stricter than the fuzzy threshold-based
    detection below it: that one is for a human to judge ("these two are
    probably the same question, worded slightly differently"); this one
    only fires when there is no judgment call left to make, because
    everything a student would see or be scored on is identical.

    Returns the number of pairs actually merged.
    """
    candidates = connection.execute(
        _EXACT_MATCH_QUERY,
        {"workspace_id": workspace_id, "mock_test_id": mock_test_id},
    ).fetchall()

    merged = 0
    for row in candidates:
        if _merge_pair(connection, workspace_id, row["id_a"], row["id_b"]):
            merged += 1
    return merged


def auto_merge_exact_duplicates_for_workspace(connection, workspace_id):
    """Full-workspace counterpart to auto_merge_exact_duplicates_for_mock_test,
    same relationship detect_duplicates_for_workspace has to
    detect_duplicates_for_mock_test - not called automatically, this is
    the one-time backfill for exact duplicates that predate this feature
    (or that the options-blind fuzzy detector already has sitting in the
    review queue as 'pending' today). Run via
    `python -m worker.duplicate_detector --auto-merge --workspace-id <uuid>`
    (or `--all`).
    """
    query = """
        SELECT a.id AS id_a, b.id AS id_b
        FROM questions a
        JOIN questions b
          ON a.workspace_id = b.workspace_id
         AND a.id < b.id
         AND a.content_id <> b.content_id
         AND a.question_text = b.question_text
         AND a.options = b.options
         AND a.correct_option_indexes = b.correct_option_indexes
         AND a.question_type = b.question_type
        WHERE a.workspace_id = %(workspace_id)s
    """
    candidates = connection.execute(query, {"workspace_id": workspace_id}).fetchall()

    merged = 0
    for row in candidates:
        if _merge_pair(connection, workspace_id, row["id_a"], row["id_b"]):
            merged += 1
    return merged


def _insert_candidate_pairs(connection, query, params):
    """Runs a SELECT of (id_a, id_b, score) candidate pairs and inserts
    each into question_duplicate_pairs, normalizing to the canonical
    id_a < id_b ordering the table's CHECK constraint requires (a pair
    detected as (b, a) - b's id happening to sort lower than a's - would
    otherwise violate that constraint outright instead of just quietly
    deduplicating against the unique index, so this normalizes ordering
    up front rather than relying on the DB to reject and letting the
    caller retry).

    Returns the number of NEW pairs inserted (re-detected existing pairs,
    of any status, don't count - ON CONFLICT DO NOTHING is silent).
    """
    rows = connection.execute(query, params).fetchall()

    inserted = 0
    with connection.transaction():
        for row in rows:
            id_a, id_b = row["id_a"], row["id_b"]
            if id_a == id_b:
                continue
            if id_a > id_b:
                id_a, id_b = id_b, id_a

            result = connection.execute(
                """
                INSERT INTO question_duplicate_pairs
                    (workspace_id, question_id_a, question_id_b, similarity_score)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (question_id_a, question_id_b) DO NOTHING
                RETURNING id
                """,
                [params["workspace_id"], id_a, id_b, row["score"]],
            )
            if result.fetchone():
                inserted += 1

    return inserted


def detect_duplicates_for_mock_test(
    connection, workspace_id, mock_test_id, threshold=DEFAULT_THRESHOLD
):
    """Compares every question in `mock_test_id` against every OTHER
    question in the workspace (any other mock test - deliberately not
    excluding rejected/needs_review questions, since a duplicate is worth
    surfacing regardless of the OTHER copy's own review status). Does not
    compare mock_test_id's questions against each other - two questions
    placed in the same paper by the same author are far less likely to be
    an accidental duplicate worth a reviewer's time than two questions
    that arrived from separate uploads.
    """
    query = """
        SELECT a.id AS id_a, b.id AS id_b,
               similarity(a.question_text, b.question_text) AS score
        FROM questions a
        JOIN questions b
          ON a.workspace_id = b.workspace_id
         AND b.mock_test_id <> %(mock_test_id)s
         AND a.content_id <> b.content_id
         AND a.question_text %% b.question_text
        WHERE a.workspace_id = %(workspace_id)s
          AND a.mock_test_id = %(mock_test_id)s
          AND similarity(a.question_text, b.question_text) > %(threshold)s
    """
    params = {
        "workspace_id": workspace_id,
        "mock_test_id": mock_test_id,
        "threshold": threshold,
    }
    return _insert_candidate_pairs(connection, query, params)


def detect_duplicates_for_workspace(
    connection, workspace_id, threshold=DEFAULT_THRESHOLD
):
    """Full pairwise scan across every question already in the workspace -
    the one-time backfill for data that predates this feature. `a.id <
    b.id` keeps this to one direction per pair (roughly half the
    comparisons of a naive full cross join) rather than relying on
    _insert_candidate_pairs' normalization to filter duplicate directions
    out after the fact.
    """
    query = """
        SELECT a.id AS id_a, b.id AS id_b,
               similarity(a.question_text, b.question_text) AS score
        FROM questions a
        JOIN questions b
          ON a.workspace_id = b.workspace_id
         AND a.id < b.id
         AND a.content_id <> b.content_id
         AND a.question_text %% b.question_text
        WHERE a.workspace_id = %(workspace_id)s
          AND similarity(a.question_text, b.question_text) > %(threshold)s
    """
    params = {"workspace_id": workspace_id, "threshold": threshold}
    return _insert_candidate_pairs(connection, query, params)


def _all_workspace_ids(connection):
    rows = connection.execute("SELECT id FROM workspaces").fetchall()
    return [row["id"] for row in rows]


def main():
    parser = argparse.ArgumentParser(
        description="One-time full-workspace duplicate question backfill "
        "(migrations/024_duplicate_detection.sql). Ongoing detection (and, "
        "as of the exact-match auto-merge feature, auto-merging) both run "
        "automatically per-job via worker.py - this is only for scanning "
        "questions that existed before that started."
    )
    parser.add_argument("--workspace-id", help="Scan a single workspace by id.")
    parser.add_argument("--all", action="store_true", help="Scan every workspace.")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Similarity threshold, 0-1 (default {DEFAULT_THRESHOLD}). "
        "Ignored with --auto-merge, which never uses a threshold - only "
        "exact matches qualify.",
    )
    parser.add_argument(
        "--auto-merge",
        action="store_true",
        help="Instead of the fuzzy pending-review scan, find and "
        "immediately merge EXACT duplicates only (identical text, "
        "options, correct answers, and question type) across the whole "
        "workspace. Safe to run repeatedly - already-merged pairs simply "
        "won't match anymore (they now share one content_id).",
    )
    args = parser.parse_args()

    if not args.workspace_id and not args.all:
        parser.error("Pass --workspace-id <uuid> or --all")

    with get_connection() as connection:
        workspace_ids = (
            _all_workspace_ids(connection) if args.all else [args.workspace_id]
        )
        for workspace_id in workspace_ids:
            if args.auto_merge:
                merged = auto_merge_exact_duplicates_for_workspace(
                    connection, workspace_id
                )
                connection.commit()
                print(f"Workspace {workspace_id}: {merged} pair(s) auto-merged")
            else:
                inserted = detect_duplicates_for_workspace(
                    connection, workspace_id, threshold=args.threshold
                )
                connection.commit()
                print(f"Workspace {workspace_id}: {inserted} new duplicate pair(s)")


if __name__ == "__main__":
    main()