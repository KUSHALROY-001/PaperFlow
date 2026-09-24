import argparse
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor

from ..ai import (
    enhance_questions_with_ai,
    generate_questions_from_metadata,
    get_provider,
    prepare_questions_for_persistence,
)
from ..config import (
    MAX_JOBS_PER_RUN,
    POLL_INTERVAL_SECONDS,
    QUESTION_WRITE_BATCH_SIZE,
    WORKER_CONCURRENCY,
)
from ..db import (
    JobCancelled,
    claim_next_job,
    count_questions_for_mock_test,
    flag_orphaned_question_slots,
    get_connection,
    get_existing_question_numbers,
    mark_mock_test_after_processing,
    replace_questions,
    update_job,
    upsert_question_batch,
)
from ..grading import process_next_grading_batch
from .job_duplicate_handling import (
    report_diagram_upload_errors,
    run_duplicate_detection,
    run_duplicate_regeneration,
)
from .job_helpers import (
    PartialSaveFailed,
    _batched,
    _count_pages_with_text,
    _mark_partial_save_failure,
    check_not_cancelled,
    friendly_job_error_message,
)
from .job_pdf_intake import ingest_job_pdf
from ..question_parser import parse_questions
from ..storage import upload_diagram


def process_job(job):
    # "Generate from existing tests" has no PDF at all - branches into its
    # own function immediately, before anything below that assumes
    # download_job_pdf(job) will succeed (it won't - uploaded_file_id
    # is NULL for this job type, see migration 034's header for why that's
    # safe and what it required fixing in db_jobs.py#claim_next_job).
    document_type = (job.get("input_config") or {}).get("documentType", "questions")
    if document_type == "generate_from_existing":
        return process_generation_job(job)

    pages, pdf_path, temp_pdf_paths, ocr_summary = ingest_job_pdf(job)

    check_not_cancelled(job["id"])

    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="Parsing questions",
            progress=55,
            summary={
                "pagesWithText": _count_pages_with_text(pages),
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
    desired_question_count = (job.get("input_config") or {}).get(
        "desiredQuestionCount"
    )

    check_not_cancelled(job["id"])

    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="AI cleanup",
            progress=68,
            summary={
                "pagesWithText": _count_pages_with_text(pages),
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

    # Snapshot which question numbers this mock test already has, BEFORE
    # touching anything - this used to be an upfront delete_existing_
    # questions call that wiped every slot immediately, well before the
    # new extraction had produced a single replacement. That's what made
    # a reprocess look like it instantly deleted the paper (the Review tab
    # just reflects the DB truth, and the truth was "zero questions" the
    # moment this job started), and made a cancelled reprocess lose
    # everything permanently - nothing ever restored what the delete had
    # already committed.
    #
    # Nothing is deleted here. persist_vision_chunk below already replaces
    # a slot in place, per question_no, via upsert_question_batch, the
    # instant that number's new content actually arrives - an old
    # question's content now survives untouched until its own replacement
    # is ready, and a cancelled run simply stops before reaching whatever
    # it hasn't gotten to yet, leaving that old content exactly as it was.
    # This snapshot only exists so the end of this function can tell which
    # of these question numbers the run never touched at all (see
    # flag_orphaned_question_slots below).
    with get_connection() as connection:
        with connection.transaction():
            row = connection.execute(
                "SELECT status FROM processing_jobs WHERE id = %s FOR UPDATE",
                [job["id"]],
            ).fetchone()
            if row is None or row["status"] == "cancelled":
                raise JobCancelled(job["id"])
            pre_existing_question_numbers = get_existing_question_numbers(
                connection, job["mock_test_id"]
            )

    streamed_question_numbers = set()
    streamed_inserted = 0
    streamed_diagrams = 0
    diagram_upload_errors = []

    def persist_vision_chunk(chunk_questions, result):
        nonlocal streamed_inserted, streamed_diagrams

        # The provider invokes this in page order. A later page-boundary
        # correction can therefore safely replace its earlier slot.
        prepare_questions_for_persistence(chunk_questions, template_context)

        for batch in _batched(chunk_questions, QUESTION_WRITE_BATCH_SIZE):
            with get_connection() as connection:
                with connection.transaction():
                    row = connection.execute(
                        "SELECT status FROM processing_jobs WHERE id = %s FOR UPDATE",
                        [job["id"]],
                    ).fetchone()
                    if row is None or row["status"] == "cancelled":
                        raise JobCancelled(job["id"])
                    batch_inserted, pending_writes, batch_diagrams = upsert_question_batch(
                        connection,
                        workspace_id=job["workspace_id"],
                        mock_test_id=job["mock_test_id"],
                        questions=batch,
                    )

            for pending_write in pending_writes:
                try:
                    upload_diagram(pending_write["png_bytes"], pending_write["public_id"])
                except Exception as error:
                    diagram_upload_errors.append(f"{pending_write['public_id']}: {error}")
                    print(f"Failed to upload diagram asset {pending_write['public_id']}: {error}")
                finally:
                    pending_write["png_bytes"] = None

            for question in batch:
                question.pop("_diagram_crops", None)
                streamed_question_numbers.add(question["question_no"])
            streamed_inserted += batch_inserted
            streamed_diagrams += batch_diagrams

        with get_connection() as connection:
            update_job(
                connection,
                job["id"],
                status="running",
                stage=(
                    f"AI cleanup (pages {result['start_page']}-{result['end_page']}; "
                    f"{len(streamed_question_numbers)} saved)"
                ),
                progress=72,
                summary={
                    "pagesWithText": _count_pages_with_text(pages),
                    "ocr": ocr_summary,
                    "questionsInserted": len(streamed_question_numbers),
                    "questionWriteBatchSize": QUESTION_WRITE_BATCH_SIZE,
                },
            )
            connection.commit()

    questions, ai_summary = enhance_questions_with_ai(
        pages,
        questions,
        pdf_path=pdf_path,
        document_type=document_type,
        # was_scanned means "the WHOLE document's reading order is
        # unreliable, route every page to vision" - only true for a fully
        # scanned document (pagesWithTextBeforeOcr == 0), not merely
        # "some pages got OCR'd". OCR now runs per-page for a mixed
        # document (see convert_scanned_pdf_to_searchable_pdf), so
        # `converted` alone would wrongly force every plain-text page
        # through vision too just because a couple of OTHER pages needed
        # OCR - per-page needsVision already routes those specific pages
        # correctly without that blanket cost.
        was_scanned=bool(ocr_summary.get("converted")) and ocr_summary.get("pagesWithTextBeforeOcr") == 0,
        on_progress=report_ai_progress,
        on_vision_chunk=persist_vision_chunk,
        template_context=template_context,
        desired_question_count=desired_question_count,
    )

    total_parsed = len(questions)
    base_summary = {
        "pagesWithText": _count_pages_with_text(pages),
        "ocr": ocr_summary,
        "regexQuestionsParsed": ai_summary.get("regexQuestionsParsed"),
        "ai": ai_summary,
        "questionsParsed": total_parsed,
        "questionWriteBatchSize": QUESTION_WRITE_BATCH_SIZE,
    }

    # Vision results have already cleared and incrementally repopulated the
    # paper. If no vision response was usable, retain the legacy final-save
    # path for text-only, notes, and AI-disabled extraction.
    if not streamed_question_numbers:
        with get_connection() as connection:
            with connection.transaction():
                # Locks the job and re-checks cancellation at the precise
                # point the non-vision fallback is about to persist.
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
                    summary=base_summary,
                )

    # Phase 2: insert in batches, each one its own transaction, each one's
    # diagram bytes uploaded and dropped before the next batch starts.
    # Committing as we go means a failure at batch 40 of 100 leaves the
    # first ~1200 questions saved and reviewable instead of throwing the
    # whole extraction away - that is a deliberate trade (see the partial
    # handling below), not an oversight.
    inserted = streamed_inserted
    diagrams_extracted = streamed_diagrams
    # Vision chunks have already committed. The final pass only handles
    # non-vision fallback questions that were not published earlier.
    batches = _batched(
        [q for q in questions if q["question_no"] not in streamed_question_numbers],
        QUESTION_WRITE_BATCH_SIZE,
    )
    total_batches = len(batches)
    last_reported_progress = 80

    for batch_index, batch in enumerate(batches, start=1):
        try:
            with get_connection() as connection:
                with connection.transaction():
                    # Re-taken per batch rather than once up front: with
                    # the save now spread over many short transactions, a
                    # cancellation arriving mid-save should stop at the
                    # next batch boundary instead of writing the remaining
                    # 2000 questions of a job nobody is waiting for.
                    row = connection.execute(
                        "SELECT status FROM processing_jobs WHERE id = %s FOR UPDATE",
                        [job["id"]],
                    ).fetchone()
                    if row is None or row["status"] == "cancelled":
                        raise JobCancelled(job["id"])

                    # upsert, not insert: this mock test's old questions are
                    # no longer wiped up front (see the snapshot comment
                    # above), so a question_no already occupied by a
                    # previous run's slot must be replaced in place here
                    # exactly like persist_vision_chunk already does for
                    # the streamed path - a plain insert would collide with
                    # question_slots' (mock_test_id, question_no) unique
                    # constraint instead.
                    batch_inserted, pending_diagram_writes, batch_diagrams = upsert_question_batch(
                        connection,
                        workspace_id=job["workspace_id"],
                        mock_test_id=job["mock_test_id"],
                        questions=batch,
                    )
        except JobCancelled:
            raise
        except (Exception, KeyboardInterrupt, SystemExit) as error:
            # This batch rolled back; every batch before it is already
            # committed. Record that explicitly - a job that saved 1200 of
            # 3000 questions must not look identical to one that saved
            # nothing, and process_next_job's generic failure handler would
            # otherwise force the mock test back to 'draft'.
            _mark_partial_save_failure(
                job,
                error,
                summary={
                    **base_summary,
                    "questionsInserted": inserted,
                    "diagramsExtracted": diagrams_extracted,
                    "partialSave": True,
                    "failedAtBatch": batch_index,
                    "totalBatches": total_batches,
                },
            )
            raise PartialSaveFailed(
                f"Saving questions failed at batch {batch_index}/{total_batches} "
                f"after {inserted} question(s) were committed: {error}"
            ) from error

        inserted += batch_inserted
        diagrams_extracted += batch_diagrams

        # Uploaded per batch and deliberately AFTER that batch's
        # transaction committed - see db_questions.py#insert_question_batch.
        # Uploading to Cloudinary first and the DB rows second would risk
        # an orphaned asset pointing at a question that got rolled back;
        # this order can only ever leave a question_assets row with no
        # Cloudinary asset behind it yet (which the signed-URL image
        # endpoint should treat as "not found" - a much safer failure than
        # serving a phantom row for bytes that were never uploaded).
        for pending_write in pending_diagram_writes:
            try:
                upload_diagram(pending_write["png_bytes"], pending_write["public_id"])
            except Exception as error:
                # Best-effort - the question and its DB asset row are
                # already committed and correct either way; losing one
                # diagram image to an upload error shouldn't fail a job
                # that otherwise succeeded.
                diagram_upload_errors.append(f"{pending_write['public_id']}: {error}")
                print(f"Failed to upload diagram asset {pending_write['public_id']}: {error}")
            finally:
                # Drop the reference as soon as this one is handled, so
                # peak memory is bounded by ONE batch's crops rather than
                # the whole document's.
                pending_write["png_bytes"] = None
        pending_diagram_writes.clear()

        # These questions are saved; their crop bytes have no further use
        # here and `questions` itself stays alive until the end of this
        # function (its length is the return value).
        for saved_question in batch:
            saved_question.pop("_diagram_crops", None)

        # 80 -> 97 across the save, so a long save shows real movement
        # instead of sitting at 80 and then jumping to 100. Only written
        # when the whole-number percentage actually changes: update_job
        # also appends a processing_job_events row, and 100 batches would
        # otherwise mean 100 near-identical events per job.
        progress = 80 + int(17 * batch_index / total_batches)
        if progress != last_reported_progress or batch_index == total_batches:
            last_reported_progress = progress
            with get_connection() as connection:
                update_job(
                    connection,
                    job["id"],
                    status="running",
                    stage=f"Saving questions ({inserted}/{total_parsed})",
                    progress=progress,
                    summary={**base_summary, "questionsInserted": inserted},
                )
                connection.commit()

    # A streamed page-boundary correction replaces an existing slot and is
    # deliberately counted as a write above. The database count is the
    # authoritative final paper length, not the number of write operations.
    with get_connection() as connection:
        saved_question_count = count_questions_for_mock_test(
            connection, job["mock_test_id"]
        )

    # Phase 3: every batch committed - flip the mock test and the job to
    # their final state.
    #
    # This is also the only point flag_orphaned_question_slots is called -
    # deliberately: it only runs once this job has reached genuine,
    # successful completion (every earlier failure/cancellation path above
    # raises before this line), because an incomplete run hasn't earned
    # the right to claim a question number is actually gone from the
    # paper. touched_question_numbers is every question_no this run's
    # final result covers - both the streamed and the fallback-batch
    # paths land in `questions` by this point - compared against the
    # pre-run snapshot taken at the very start of this function.
    touched_question_numbers = {q["question_no"] for q in questions}
    with get_connection() as connection:
        with connection.transaction():
            mark_mock_test_after_processing(
                connection, job["mock_test_id"], saved_question_count
            )
            flagged_count = flag_orphaned_question_slots(
                connection,
                job["mock_test_id"],
                pre_existing_question_numbers,
                touched_question_numbers,
            )
            update_job(
                connection,
                job["id"],
                status="completed",
                stage="Completed",
                progress=100,
                summary={
                    **base_summary,
                    "questionsInserted": saved_question_count,
                    "diagramsExtracted": diagrams_extracted,
                    **({"questionsFlaggedStale": flagged_count} if flagged_count else {}),
                },
            )

    report_diagram_upload_errors(job, diagram_upload_errors)
    run_duplicate_detection(job)


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

    return saved_question_count


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
            # this job type - a generated question never has diagram crops,
            # since the metadata-generation prompt has no source page image,
            # so question.get("_diagram_crops") is always falsy here and
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

    report_diagram_upload_errors(job, diagram_upload_errors)
    run_duplicate_detection(job)
    run_duplicate_regeneration(job, difficulty_hint, provider)


    return len(questions)




def process_next_job():
    with get_connection() as connection:
        job = claim_next_job(connection)
        connection.commit()

    if not job:
        return process_next_grading_batch()

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
    except PartialSaveFailed as error:
        # process_job already wrote status='failed', the partial summary,
        # and the mock test's status derived from the rows that committed.
        # Re-doing any of that here would clobber it with zeros.
        print(f"Job {job['id']} failed mid-save: {error}")
        traceback.print_exc()
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