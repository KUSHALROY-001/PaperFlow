"""Duplicate question detection (migrations/024_duplicate_detection.sql).

Two entry points:

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

Both share _insert_candidate_pairs, which does the actual similarity
scoring + insert. threshold=0.55 is a deliberately conservative starting
point (see the implementation plan) - not a validated number, just a
reasonable "don't be noisy on day one" guess to revisit once there's a
real batch of results to look at.

Both queries also exclude pairs whose two slots already share the same
content_id (migration 030) - once a merge or a Question Bank copy has
repointed one slot's content onto another's, their question_text is
trivially identical (100% similarity) and re-flagging that as a "new"
duplicate on every subsequent run would just be pure noise, not a
genuine finding a reviewer needs to act on again.
"""

import argparse

from .db import get_connection

DEFAULT_THRESHOLD = 0.55


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
        "(migrations/024_duplicate_detection.sql). Ongoing detection runs "
        "automatically per-job via worker.py - this is only for scanning "
        "questions that existed before that started."
    )
    parser.add_argument("--workspace-id", help="Scan a single workspace by id.")
    parser.add_argument("--all", action="store_true", help="Scan every workspace.")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Similarity threshold, 0-1 (default {DEFAULT_THRESHOLD}).",
    )
    args = parser.parse_args()

    if not args.workspace_id and not args.all:
        parser.error("Pass --workspace-id <uuid> or --all")

    with get_connection() as connection:
        workspace_ids = (
            _all_workspace_ids(connection) if args.all else [args.workspace_id]
        )
        for workspace_id in workspace_ids:
            inserted = detect_duplicates_for_workspace(
                connection, workspace_id, threshold=args.threshold
            )
            connection.commit()
            print(f"Workspace {workspace_id}: {inserted} new duplicate pair(s)")


if __name__ == "__main__":
    main()
