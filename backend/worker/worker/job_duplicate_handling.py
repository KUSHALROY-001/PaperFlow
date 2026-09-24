"""Duplicate-question handling shared between process_job and
process_generation_job (worker.py) - both used to carry their own copy of
this logic; split out so there's exactly one version of each. Split out
of worker.py - see backend/worker/ARCHITECTURE.md.
"""

from ..ai import regenerate_flagged_duplicates
from ..config import AI_DUPLICATE_REGEN_THRESHOLD
from ..db import (
    add_job_event,
    delete_duplicate_pair,
    find_flagged_duplicate_slots,
    get_connection,
    replace_slot_content,
)
from ..duplicate_detector import detect_duplicates_for_mock_test


def report_diagram_upload_errors(job, diagram_upload_errors):
    if not diagram_upload_errors:
        return
    with get_connection() as connection:
        add_job_event(
            connection,
            job["id"],
            "warning",
            f"Cloud image upload warning: {len(diagram_upload_errors)} diagram(s) could not be uploaded",
            {"errors": diagram_upload_errors[:5]},
        )
        connection.commit()


def run_duplicate_detection(job):
    # Called deliberately outside the caller's own "Saving questions"
    # transaction, only once that's committed - scans this job's
    # newly-inserted questions against the rest of the workspace's question
    # bank (see duplicate_detector.py; migrations/020_duplicate_detection.sql)
    # so a reused topic bank gets flagged incrementally, one job at a time,
    # instead of needing a full workspace rescan on every extraction.
    # Best-effort, same as report_diagram_upload_errors above: a detection
    # failure (e.g. the pg_trgm extension missing on some environment)
    # shouldn't fail a job whose actual questions were extracted and saved
    # fine.
    try:
        with get_connection() as connection:
            new_pairs = detect_duplicates_for_mock_test(
                connection, job["workspace_id"], job["mock_test_id"]
            )
        if new_pairs:
            print(f"Found {new_pairs} new duplicate question pair(s)")
    except Exception as error:
        print(f"Duplicate detection failed for job {job['id']}: {error}")


def run_duplicate_regeneration(job, difficulty_hint, provider):
    # One bounded regeneration pass for whatever the fuzzy detector above
    # JUST flagged as a near-duplicate of something already in the
    # workspace, at or above AI_DUPLICATE_REGEN_THRESHOLD - see
    # db_duplicates.py#find_flagged_duplicate_slots and
    # ai/provider.py#regenerate_flagged_duplicates. Deliberately only ONE
    # pass, not a loop that keeps re-checking and re-regenerating until
    # clean: a topic narrow enough that the model converges on the same
    # canonical example twice could in principle do it a third time too,
    # and this codebase's whole reason for existing right now is to spend
    # LESS of a rate-limited quota per generation, not chase a
    # not-strictly-guaranteed zero-duplication outcome. Whatever's still
    # flagged after this one pass is left exactly where it already was -
    # its pair row stays in question_duplicate_pairs, showing up in the
    # duplicates report same as any other near-duplicate this pipeline has
    # ever surfaced.
    try:
        with get_connection() as connection:
            flagged = find_flagged_duplicate_slots(
                connection,
                job["workspace_id"],
                job["mock_test_id"],
                AI_DUPLICATE_REGEN_THRESHOLD,
            )
        if flagged:
            replacements, regen_summary = regenerate_flagged_duplicates(
                flagged, difficulty_hint, provider
            )
            with get_connection() as connection:
                with connection.transaction():
                    for item in flagged:
                        replacement = replacements.get(item["slot_id"])
                        if not replacement:
                            continue
                        replaced = replace_slot_content(
                            connection,
                            job["workspace_id"],
                            item["slot_id"],
                            replacement,
                        )
                        if replaced:
                            delete_duplicate_pair(connection, item["pair_id"])
            print(
                f"Regenerated {regen_summary['questionsRegenerated']}/"
                f"{len(flagged)} flagged near-duplicate question(s)"
            )
    except Exception as error:
        print(f"Duplicate regeneration failed for job {job['id']}: {error}")
