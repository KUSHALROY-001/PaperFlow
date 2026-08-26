import argparse
import json
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor

from .config import (
    AI_DUPLICATE_REGEN_THRESHOLD,
    MAX_JOBS_PER_RUN,
    OCR_ENABLED,
    POLL_INTERVAL_SECONDS,
    WORKER_CONCURRENCY,
)
from .ai import (
    enhance_questions_with_ai,
    generate_questions_from_metadata,
    get_provider,
    regenerate_flagged_duplicates,
)
from .duplicate_detector import (
    auto_merge_exact_duplicates_for_mock_test,
    detect_duplicates_for_mock_test,
)
from .db import (
    JobCancelled,
    add_job_event,
    claim_next_job,
    find_flagged_duplicate_slots,
    get_connection,
    is_job_cancelled,
    mark_mock_test_after_processing,
    replace_questions,
    replace_slot_content,
    resolve_regenerated_duplicate_pair,
    update_job,
)
from .pdf_extract import extract_pdf_pages
from .pdf_ocr import convert_scanned_pdf_to_searchable_pdf
from .question_parser import parse_questions
from .storage import download_pdf_to_temp_file, upload_diagram


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


def process_job(job):
    # "Generate from existing tests" has no PDF at all - branches into its
    # own function immediately, before anything below that assumes
    # download_job_pdf(job) will succeed (it won't - uploaded_file_id
    # is NULL for this job type, see migration 034's header for why that's
    # safe and what it required fixing in db.py#claim_next_job).
    document_type = (job.get("input_config") or {}).get("documentType", "questions")
    if document_type == "generate_from_existing":
        return process_generation_job(job)

    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="Extracting PDF text",
            progress=20,
        )
        connection.commit()

    # Downloaded fresh from B2 for this one job and deleted in the
    # cleanup loop near the end of this function, regardless of how this
    # function exits - never a permanent location anything else refers
    # back to (unlike the old local-disk convention, where the uploaded
    # file's path stuck around for as long as the mock test existed). If
    # OCR later replaces pdf_path with its own searchable-PDF output (see
    # below), that temp file's cleanup is handled the same way.
    pdf_path = download_job_pdf(job)
    temp_pdf_paths = [pdf_path]
    pages = extract_pdf_pages(pdf_path)
    ocr_summary = {
        "enabled": OCR_ENABLED,
        "converted": False,
        "pagesOcrd": 0,
        "searchablePdfPath": None,
    }

    check_not_cancelled(job["id"])

    if OCR_ENABLED and len(pages) == 0:
        with get_connection() as connection:
            update_job(
                connection,
                job["id"],
                status="running",
                stage="Converting scanned PDF with OCR",
                progress=35,
                summary={
                    "pagesWithText": len(pages),
                    "ocr": ocr_summary,
                },
            )
            connection.commit()

        try:
            ocr_result = convert_scanned_pdf_to_searchable_pdf(pdf_path)
            ocr_summary = {
                "enabled": True,
                "converted": ocr_result.converted,
                "pagesOcrd": ocr_result.pages_ocrd,
                "pagesWithTextBeforeOcr": ocr_result.pages_with_text_before_ocr,
                "searchablePdfPath": str(ocr_result.output_path) if ocr_result.output_path else None,
                "error": None,
            }

            if ocr_result.output_path:
                pdf_path = ocr_result.output_path
                temp_pdf_paths.append(pdf_path)
                pages = extract_pdf_pages(pdf_path)
        except Exception as error:
            ocr_summary = {
                "enabled": True,
                "converted": False,
                "pagesOcrd": 0,
                "searchablePdfPath": None,
                "error": str(error),
            }

    check_not_cancelled(job["id"])

    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="Parsing questions",
            progress=55,
            summary={
                "pagesWithText": len(pages),
                "ocr": ocr_summary,
            },
        )
        connection.commit()

    questions = parse_questions(pages)

    # Set at upload time (mock-tests.service.js#uploadDocument) based on what
    # the user told us the PDF is. Defaults to "questions" so jobs queued
    # before this field existed behave exactly as they did before.
    document_type = (job.get("input_config") or {}).get("documentType", "questions")

    # Present only when this job's mock test was created via "Apply
    # Template" (see mock-tests.service.js#buildTemplateContext /
    # extraction-templates.service.js#applyTemplate) - None for every other
    # job, in which case enhance_questions_with_ai's prompt and summary are
    # completely unchanged from before this existed.
    template_context = (job.get("input_config") or {}).get("templateContext")

    check_not_cancelled(job["id"])

    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="AI cleanup",
            progress=68,
            summary={
                "pagesWithText": len(pages),
                "ocr": ocr_summary,
                "regexQuestionsParsed": len(questions),
                "documentType": document_type,
            },
        )
        connection.commit()

    def report_ai_progress(stage_message):
        # Real-time checkpoint so a job that's genuinely still working
        # through several AI chunks is distinguishable in the DB from one
        # that's silently orphaned - previously this whole phase wrote
        # "AI cleanup" once and then nothing else until it finished,
        # indistinguishable from a dead job without checking the worker's
        # own terminal.
        with get_connection() as connection:
            update_job(connection, job["id"], status="running", stage=stage_message, progress=68)
            connection.commit()

        # The AI stage is by far the slowest part of a job, often running
        # over several chunked calls - this is the one checkpoint inside
        # it, so a cancelled job stops between chunks instead of finishing
        # every remaining chunk first. Raising here (rather than just
        # returning) works precisely because JobCancelled is a
        # BaseException: ai/provider.py#report wraps this callback in
        # `except Exception: pass`, which would otherwise silently
        # swallow anything raised here.
        check_not_cancelled(job["id"])

    questions, ai_summary = enhance_questions_with_ai(
        pages,
        questions,
        pdf_path=pdf_path,
        document_type=document_type,
        was_scanned=bool(ocr_summary.get("converted")),
        on_progress=report_ai_progress,
        template_context=template_context,
    )

    with get_connection() as connection:
        with connection.transaction():
            # Locks this job's row and re-checks cancellation as the very
            # first thing inside the transaction that's about to persist
            # its results - this is the one check in process_job that
            # can't settle for "checked recently", since it's the point of
            # no return. FOR UPDATE closes the race a plain check_not_
            # cancelled() call just before this block would leave open:
            # Node cancelling this job in the instant between that check
            # and this transaction starting. Raising here rolls the
            # transaction back automatically (psycopg3's transaction
            # context manager rolls back on any exception).
            row = connection.execute(
                "SELECT status FROM processing_jobs WHERE id = %s FOR UPDATE",
                [job["id"]],
            ).fetchone()
            if row is None or row["status"] == "cancelled":
                raise JobCancelled(job["id"])

            update_job(
                connection,
                job["id"],
                status="running",
                stage="Saving questions",
                progress=80,
                summary={
                    "pagesWithText": len(pages),
                    "ocr": ocr_summary,
                    "regexQuestionsParsed": ai_summary.get("regexQuestionsParsed"),
                    "ai": ai_summary,
                    "questionsParsed": len(questions),
                },
            )
            inserted, pending_diagram_writes, diagrams_extracted = replace_questions(
                connection,
                workspace_id=job["workspace_id"],
                mock_test_id=job["mock_test_id"],
                questions=questions,
            )
            mark_mock_test_after_processing(connection, job["mock_test_id"], inserted)
            update_job(
                connection,
                job["id"],
                status="completed",
                stage="Completed",
                progress=100,
                summary={
                    "pagesWithText": len(pages),
                    "ocr": ocr_summary,
                    "ai": ai_summary,
                    "questionsParsed": len(questions),
                    "questionsInserted": inserted,
                    "diagramsExtracted": diagrams_extracted,
                },
            )

    # Deliberately OUTSIDE the transaction block above, and only reached if
    # it committed successfully - see db.py#replace_questions. Uploading
    # to Cloudinary first and the DB rows second would risk an orphaned
    # asset pointing at a question that got rolled back; this order can
    # only ever leave a question_assets row with no Cloudinary asset
    # behind it yet (which the signed-URL image endpoint should treat as
    # "not found" - a much safer failure than serving a phantom row for
    # bytes that were never uploaded).
    diagram_upload_errors = []
    for pending_write in pending_diagram_writes:
        try:
            upload_diagram(pending_write["png_bytes"], pending_write["public_id"])
        except Exception as error:
            # Best-effort - the question and its DB asset row are already
            # committed and correct either way; losing one diagram image to
            # an upload error shouldn't fail a job that otherwise succeeded.
            diagram_upload_errors.append(f"{pending_write['public_id']}: {error}")
            print(f"Failed to upload diagram asset {pending_write['public_id']}: {error}")

    if diagram_upload_errors:
        with get_connection() as connection:
            add_job_event(
                connection,
                job["id"],
                "warning",
                f"Cloud image upload warning: {len(diagram_upload_errors)} diagram(s) could not be uploaded",
                {"errors": diagram_upload_errors[:5]},
            )
            connection.commit()

    # Also deliberately outside the "Saving questions" transaction and only
    # reached once that committed - first auto-merges any EXACT duplicate
    # this job's questions form with the rest of the workspace's question
    # bank (identical text, options, correct answers, and question type -
    # no judgment call, so no reviewer needed), THEN runs the existing
    # fuzzy scan for near-duplicates that genuinely do need a human's
    # opinion. Auto-merge runs first so an exact match never even reaches
    # the pending review queue: once merged, both slots share one
    # content_id, and detect_duplicates_for_mock_test's own
    # `a.content_id <> b.content_id` filter (see duplicate_detector.py)
    # then correctly skips it. Two separate try/except blocks, not one -
    # a failure in either shouldn't prevent the other from still running,
    # same "best-effort" stance the diagram writes above already take.
    try:
        with get_connection() as connection:
            auto_merged = auto_merge_exact_duplicates_for_mock_test(
                connection, job["workspace_id"], job["mock_test_id"]
            )
        if auto_merged:
            print(f"Auto-merged {auto_merged} exact duplicate question pair(s)")
    except Exception as error:
        print(f"Exact-duplicate auto-merge failed for job {job['id']}: {error}")

    # Scans this job's newly-inserted questions against the rest of the
    # workspace's question bank (see duplicate_detector.py;
    # migrations/020_duplicate_detection.sql) so a reused topic bank gets
    # flagged incrementally, one job at a time, instead of needing a full
    # workspace rescan on every extraction. Best-effort like the diagram
    # writes just above: a detection failure (e.g. the pg_trgm extension
    # missing on some environment) shouldn't fail a job whose actual
    # questions were extracted and saved fine.
    try:
        with get_connection() as connection:
            new_pairs = detect_duplicates_for_mock_test(
                connection, job["workspace_id"], job["mock_test_id"]
            )
        if new_pairs:
            print(f"Found {new_pairs} new duplicate question pair(s)")
    except Exception as error:
        print(f"Duplicate detection failed for job {job['id']}: {error}")

    # Best-effort, success-path cleanup - a job that raises before reaching
    # here (an AI failure, a cancellation) leaves its temp file behind for
    # the OS to reclaim on its own (container restart, /tmp's own
    # lifecycle), rather than this function needing a full try/finally
    # around everything above just to guarantee it. That's a deliberate
    # trade: leftover temp files on the rarer failure path are a much
    # smaller problem than the bug this replaced (a worker that could
    # never find the uploaded file at all).
    for temp_path in temp_pdf_paths:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception as error:
            print(f"Failed to remove temp PDF {temp_path}: {error}")

    return len(questions)


# "Generate from existing tests" - process_job's counterpart with no PDF,
# no OCR, no regex parsing, no diagram extraction. topicDistribution,
# targetQuestionCount, and difficultyHint all come precomputed from
# processing_jobs.input_config (see mock-tests.service.js
# #generateFromExisting / #scaleDistributionToTarget) - this function's
# only job is to turn that into questions and save them, reusing the same
# "Saving questions" transaction shape and the same post-save best-effort
# duplicate detection process_job already runs for every extraction job.
def process_generation_job(job):
    input_config = job.get("input_config") or {}
    topic_distribution = input_config.get("topicDistribution") or []
    difficulty_hint = input_config.get("difficultyHint")

    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="Generating questions",
            progress=20,
        )
        connection.commit()

    check_not_cancelled(job["id"])

    provider = get_provider()
    if not provider:
        # Same shape as enhance_questions_with_ai's own "AI disabled" path,
        # except that path can still fall back to whatever regex-parsed
        # questions it already had - this job type has none. Nothing to
        # save at all without a provider, so this is a real, actionable
        # failure, not a degraded-but-still-useful result.
        raise RuntimeError(
            "AI_PROVIDER is disabled - generating a mock test from existing "
            "tests requires an AI provider to be configured"
        )

    def report_generation_progress(stage_message):
        # Same reasoning as report_ai_progress in process_job: the one
        # checkpoint inside the (by far) slowest part of this job, so a
        # cancelled job stops between topic-group batches instead of
        # finishing every remaining one first.
        with get_connection() as connection:
            update_job(
                connection, job["id"], status="running", stage=stage_message, progress=60
            )
            connection.commit()
        check_not_cancelled(job["id"])

    report_generation_progress("Generating questions")
    questions, ai_summary = generate_questions_from_metadata(
        topic_distribution, difficulty_hint, provider
    )

    with get_connection() as connection:
        with connection.transaction():
            # Same lock-and-recheck-cancellation pattern as process_job's
            # own "Saving questions" block - see that block's comment for
            # why this is the one check that can't settle for "checked
            # recently".
            row = connection.execute(
                "SELECT status FROM processing_jobs WHERE id = %s FOR UPDATE",
                [job["id"]],
            ).fetchone()
            if row is None or row["status"] == "cancelled":
                raise JobCancelled(job["id"])

            update_job(
                connection,
                job["id"],
                status="running",
                stage="Saving questions",
                progress=80,
                summary={"ai": ai_summary, "questionsParsed": len(questions)},
            )
            # No pdf_path argument (and never was any diagram data) for
            # this job type - a generated question never has has_diagram
            # set, since METADATA_GENERATION_SYSTEM_PROMPT never asks for
            # one and normalize_ai_questions defaults it to False, so
            # question.get("_diagram_crop_bytes") is always falsy here and
            # replace_questions never produces a pending diagram write for
            # any of these questions.
            inserted, pending_diagram_writes, diagrams_extracted = replace_questions(
                connection,
                workspace_id=job["workspace_id"],
                mock_test_id=job["mock_test_id"],
                questions=questions,
            )
            mark_mock_test_after_processing(connection, job["mock_test_id"], inserted)
            update_job(
                connection,
                job["id"],
                status="completed",
                stage="Completed",
                progress=100,
                summary={
                    "ai": ai_summary,
                    "questionsParsed": len(questions),
                    "questionsInserted": inserted,
                    "diagramsExtracted": diagrams_extracted,
                },
            )

    # pending_diagram_writes will always be empty for this job type (see
    # the note above) - this loop is a no-op in practice, kept only so
    # this function's shape stays a genuine mirror of process_job's,
    # rather than a special case someone has to remember is missing a
    # step process_job has.
    diagram_upload_errors = []
    for pending_write in pending_diagram_writes:
        try:
            upload_diagram(pending_write["png_bytes"], pending_write["public_id"])
        except Exception as error:
            diagram_upload_errors.append(f"{pending_write['public_id']}: {error}")
            print(f"Failed to upload diagram asset {pending_write['public_id']}: {error}")

    if diagram_upload_errors:
        with get_connection() as connection:
            add_job_event(
                connection,
                job["id"],
                "warning",
                f"Cloud image upload warning: {len(diagram_upload_errors)} diagram(s) could not be uploaded",
                {"errors": diagram_upload_errors[:5]},
            )
            connection.commit()

    # Same best-effort duplicate handling process_job runs after every
    # extraction job - see that function's own comments for the full
    # reasoning. Running it here too means a generated question that
    # happens to closely match something already in the workspace's
    # question bank still gets flagged for review, even though the
    # generation step itself was never shown that existing question.
    try:
        with get_connection() as connection:
            auto_merged = auto_merge_exact_duplicates_for_mock_test(
                connection, job["workspace_id"], job["mock_test_id"]
            )
        if auto_merged:
            print(f"Auto-merged {auto_merged} exact duplicate question pair(s)")
    except Exception as error:
        print(f"Exact-duplicate auto-merge failed for job {job['id']}: {error}")

    try:
        with get_connection() as connection:
            new_pairs = detect_duplicates_for_mock_test(
                connection, job["workspace_id"], job["mock_test_id"]
            )
        if new_pairs:
            print(f"Found {new_pairs} new duplicate question pair(s)")
    except Exception as error:
        print(f"Duplicate detection failed for job {job['id']}: {error}")

    # One bounded regeneration pass for whatever the fuzzy detector above
    # JUST flagged as a near-duplicate of something already in the
    # workspace, at or above AI_DUPLICATE_REGEN_THRESHOLD - see
    # db.py#find_flagged_duplicate_slots and
    # ai/provider.py#regenerate_flagged_duplicates. Deliberately only ONE
    # pass, not a loop that keeps re-checking and re-regenerating until
    # clean: a topic narrow enough that the model converges on the same
    # canonical example twice could in principle do it a third time too,
    # and this codebase's whole reason for existing right now is to spend
    # LESS of a rate-limited quota per generation, not chase a
    # not-strictly-guaranteed zero-duplication outcome. Whatever's still
    # flagged after this one pass is left exactly where it already was -
    # sitting in the review queue for a human, same as any other
    # near-duplicate this pipeline has ever surfaced.
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
                            resolve_regenerated_duplicate_pair(
                                connection, item["pair_id"]
                            )
            print(
                f"Regenerated {regen_summary['questionsRegenerated']}/"
                f"{len(flagged)} flagged near-duplicate question(s)"
            )
    except Exception as error:
        print(f"Duplicate regeneration failed for job {job['id']}: {error}")

    return len(questions)


def process_next_job():
    with get_connection() as connection:
        job = claim_next_job(connection)
        connection.commit()

    if not job:
        return False

    print(f"Processing job {job['id']} for mock test {job['mock_test_id']}")

    try:
        count = process_job(job)
        print(f"Completed job {job['id']} with {count} parsed question(s)")
    except JobCancelled:
        # Superseded by a newer job for the same mock test (see
        # mock-tests.repository.js#cancelActiveProcessingJobs) - the row is
        # already status='cancelled' (either the Node backend set it
        # directly, or update_job's own "AND status <> 'cancelled'" guard
        # left it untouched), so there's nothing left to write here. In
        # particular, don't call mark_mock_test_after_processing: the
        # mock test's status is the superseding job's responsibility now,
        # not this abandoned one's.
        print(f"Job {job['id']} was cancelled (superseded by a newer job) - stopping early")
    except (Exception, KeyboardInterrupt, SystemExit) as error:
        # KeyboardInterrupt/SystemExit are BaseException, not Exception -
        # without listing them explicitly, a Ctrl+C (or SIGTERM converted
        # to SystemExit) during a job left it permanently orphaned at
        # status='running' with no failed/completed event ever written
        # (this is exactly what happened to a real job - see
        # processing_job_events for that incident's timeline). Mark it
        # failed first, then still actually stop the worker for a genuine
        # interrupt/exit instead of silently swallowing it.
        with get_connection() as connection:
            update_job(
                connection,
                job["id"],
                status="failed",
                stage="Failed",
                progress=100,
                error=friendly_job_error_message(error),
            )
            mark_mock_test_after_processing(connection, job["mock_test_id"], 0)
            connection.commit()
        # Full traceback goes to the worker's own logs only - error_message
        # above (what the UI shows) is deliberately the sanitized version.
        print(f"Failed job {job['id']}: {error}")
        traceback.print_exc()

        if isinstance(error, (KeyboardInterrupt, SystemExit)):
            raise

    return True


def run_once(max_jobs, concurrency=None):
    # Several jobs (e.g. different users' PDF uploads) are worked on at
    # once in this pool of threads, rather than one job running to full
    # completion before the next is even claimed - see WORKER_CONCURRENCY
    # in config.py for why this is safe and what it does/doesn't affect.
    #
    # started/processed are counted separately: `started` is reserved
    # (under the lock, before process_next_job runs) so concurrent threads
    # can never collectively claim more than max_jobs jobs even if they
    # all check in at once; `processed` only counts jobs that actually ran
    # (claim_next_job found a row), which is what the caller-facing return
    # value has always meant.
    concurrency = max(1, min(concurrency or WORKER_CONCURRENCY, max_jobs))
    started = 0
    processed = 0
    counter_lock = threading.Lock()
    queue_drained = threading.Event()

    def reserve_slot():
        nonlocal started
        with counter_lock:
            if started >= max_jobs or queue_drained.is_set():
                return False
            started += 1
            return True

    def worker_loop():
        nonlocal processed
        while reserve_slot():
            handled = process_next_job()
            if not handled:
                # Nothing queued right now - stop every thread in this
                # run_once call rather than having each one separately
                # discover the same empty queue.
                queue_drained.set()
                return
            with counter_lock:
                processed += 1

    with ThreadPoolExecutor(
        max_workers=concurrency, thread_name_prefix="paperflow-job"
    ) as executor:
        futures = [executor.submit(worker_loop) for _ in range(concurrency)]
        for future in futures:
            # Propagates anything worker_loop itself raised (it shouldn't -
            # process_next_job already catches per-job errors - but a
            # silent thread death would otherwise be invisible).
            future.result()

    return processed


def run_forever():
    while True:
        processed = run_once(MAX_JOBS_PER_RUN)
        if processed == 0:
            time.sleep(POLL_INTERVAL_SECONDS)


def main():
    parser = argparse.ArgumentParser(description="PaperFlow OCR worker")
    parser.add_argument("--once", action="store_true", help="Process queued jobs once and exit")
    parser.add_argument("--max-jobs", type=int, default=MAX_JOBS_PER_RUN)
    parser.add_argument(
        "--concurrency",
        type=int,
        default=None,
        help="How many jobs to run in parallel threads (defaults to WORKER_CONCURRENCY env var)",
    )
    args = parser.parse_args()

    if args.once:
        processed = run_once(args.max_jobs, concurrency=args.concurrency)
        print(f"Processed {processed} job(s)")
    else:
        run_forever()


if __name__ == "__main__":
    main()