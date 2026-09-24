"""Small, independent helpers shared across worker.py's job-processing
functions (process_job, process_generation_job, process_next_job) - job
cancellation checks, PDF download, error-message sanitizing, and
partial-save bookkeeping. Split out of worker.py - see
backend/worker/ARCHITECTURE.md.
"""

import json

from ..db import (
    JobCancelled,
    add_job_event,
    count_questions_for_mock_test,
    get_connection,
    is_job_cancelled,
    mark_mock_test_after_processing,
    update_job,
)
from ..storage import download_pdf_to_temp_file

def check_not_cancelled(job_id):
    # Called at every stage boundary in process_job (plus once per AI
    # chunk - see report_ai_progress below) so a job superseded by a
    # reprocess request (mock-tests.repository.js#cancelActiveProcessingJobs)
    # is abandoned within roughly one stage/chunk instead of running all
    # the way through and overwriting whatever the newer job produced.
    with get_connection() as connection:
        if is_job_cancelled(connection, job_id):
            raise JobCancelled(job_id)


def download_job_pdf(job):
    # input_config.storageKey is set on EVERY job (see
    # mock-tests.service.js#uploadDocument and #reprocessMockTest, which
    # both pass it through queueProcessingJob) - unlike the old
    # uploaded_files.metadata.localPath this replaces, it's never specific
    # to whichever machine originally received the upload, since it's a
    # B2 object key, not a filesystem path. Only called from the PDF
    # branch of process_job - the "generate from existing tests" branch
    # never has a storageKey (uploaded_file_id is NULL for that job type)
    # and never calls this at all.
    input_config = job.get("input_config") or {}
    if isinstance(input_config, str):
        input_config = json.loads(input_config)

    storage_key = input_config.get("storageKey")
    if not storage_key:
        raise RuntimeError("processing_jobs.input_config.storageKey is missing")

    return download_pdf_to_temp_file(storage_key)


# Every RuntimeError this codebase raises itself (grep for "raise RuntimeError"
# across worker/) is already a deliberately-worded, actionable message - a
# missing API key, missing Tesseract install, unsupported AI_PROVIDER, etc.
# FileNotFoundError similarly only ever comes from pdf_extract.py's own
# "Uploaded PDF not found: ..." raise. Anything else reaching this top-level
# handler is an exception we didn't specifically anticipate (a library
# internal, a KeyError/AttributeError from an unexpected response shape, a
# dropped DB connection, ...) whose message was never written with an end
# user in mind - that's what error_message on the job ultimately becomes
# (see ProcessingTab.jsx, which renders it verbatim in a banner to whoever
# uploaded the file), so it needs a friendly stand-in instead.
_SELF_DESCRIBING_ERROR_TYPES = (RuntimeError, FileNotFoundError, ValueError)


def friendly_job_error_message(error):
    if isinstance(error, _SELF_DESCRIBING_ERROR_TYPES):
        return str(error) or error.__class__.__name__
    err_str = str(error)
    keywords = (
        "b2",
        "backblaze",
        "cloudinary",
        "s3",
        "bucket",
        "endpoint",
        "gemini",
        "openai",
        "tesseract",
        "cloud",
        "storage",
    )
    if any(k in err_str.lower() for k in keywords):
        return err_str
    return (
        "Processing failed unexpectedly. Try re-uploading the file, or "
        "contact support if this keeps happening."
    )


def _count_pages_with_text(pages):
    # extract_pdf_pages now returns one dict per PDF page regardless of
    # whether that page has any text (see its own docstring for why -
    # dropping text-less pages used to make them invisible to vision
    # routing too), so `len(pages)` is just the page count and no longer
    # tells us how many pages actually have a text layer. This is the
    # replacement for every spot that used to read `len(pages)` for that.
    return sum(1 for page in pages if (page.get("text") or "").strip())


# Raised when a batched save fails partway through. Distinct from a plain
# Exception because process_job has ALREADY marked the job failed and set
# the mock test's status from the rows that did commit (see
# _mark_partial_save_failure) - process_next_job's generic handler would
# otherwise overwrite that with mark_mock_test_after_processing(..., 0),
# hiding questions that are genuinely saved and reviewable.
class PartialSaveFailed(Exception):
    pass


def _batched(items, size):
    return [items[start:start + size] for start in range(0, len(items), size)]


def _mark_partial_save_failure(job, error, *, summary):
    try:
        with get_connection() as connection:
            saved_count = count_questions_for_mock_test(connection, job["mock_test_id"])
            update_job(
                connection,
                job["id"],
                status="failed",
                stage="Failed",
                progress=100,
                summary={**summary, "questionsSavedInDb": saved_count},
                error=friendly_job_error_message(error),
            )
            # Not 0 like the generic failure path: these questions really
            # are in the database, so the mock test should land in 'review'
            # (partially extracted, openable in the editor) rather than
            # 'draft' (looks like nothing happened).
            mark_mock_test_after_processing(connection, job["mock_test_id"], saved_count)
            add_job_event(
                connection,
                job["id"],
                "warning",
                f"Partial save: {saved_count} question(s) were committed before this job failed",
                {"failedAtBatch": summary.get("failedAtBatch"), "totalBatches": summary.get("totalBatches")},
            )
            connection.commit()
    except Exception as marking_error:
        # Never let the bookkeeping failure replace the real one.
        print(f"Failed to record partial-save state for job {job['id']}: {marking_error}")
