import argparse
import json
import time
from pathlib import Path

from .config import MAX_JOBS_PER_RUN, OCR_ENABLED, POLL_INTERVAL_SECONDS
from .ai import enhance_questions_with_ai
from .db import (
    claim_next_job,
    get_connection,
    mark_mock_test_after_processing,
    replace_questions,
    update_job,
)
from .pdf_extract import extract_pdf_pages
from .pdf_ocr import convert_scanned_pdf_to_searchable_pdf
from .question_parser import parse_questions


def local_path_from_job(job):
    metadata = job.get("uploaded_file_metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)

    local_path = metadata.get("localPath")
    if not local_path:
        raise RuntimeError("uploaded_files.metadata.localPath is missing")

    return Path(local_path)


def process_job(job):
    with get_connection() as connection:
        update_job(
            connection,
            job["id"],
            status="running",
            stage="Extracting PDF text",
            progress=20,
        )
        connection.commit()

    pdf_path = local_path_from_job(job)
    pages = extract_pdf_pages(pdf_path)
    ocr_summary = {
        "enabled": OCR_ENABLED,
        "converted": False,
        "pagesOcrd": 0,
        "searchablePdfPath": None,
    }

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
                pages = extract_pdf_pages(pdf_path)
        except Exception as error:
            ocr_summary = {
                "enabled": True,
                "converted": False,
                "pagesOcrd": 0,
                "searchablePdfPath": None,
                "error": str(error),
            }

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
            },
        )
        connection.commit()

    questions, ai_summary = enhance_questions_with_ai(pages, questions, pdf_path=pdf_path)

    with get_connection() as connection:
        with connection.transaction():
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
            inserted = replace_questions(
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
                },
            )

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
    except Exception as error:
        with get_connection() as connection:
            update_job(
                connection,
                job["id"],
                status="failed",
                stage="Failed",
                progress=100,
                error=str(error),
            )
            mark_mock_test_after_processing(connection, job["mock_test_id"], 0)
            connection.commit()
        print(f"Failed job {job['id']}: {error}")

    return True


def run_once(max_jobs):
    processed = 0
    for _ in range(max_jobs):
        if not process_next_job():
            break
        processed += 1
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
    args = parser.parse_args()

    if args.once:
        processed = run_once(args.max_jobs)
        print(f"Processed {processed} job(s)")
    else:
        run_forever()


if __name__ == "__main__":
    main()
