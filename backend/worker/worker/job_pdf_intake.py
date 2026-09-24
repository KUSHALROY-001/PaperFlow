"""Phase 1 of process_job (worker.py): download the job's PDF, extract
page text, OCR any scanned pages, and validate there's something
extractable. Split out of worker.py - see backend/worker/ARCHITECTURE.md.
"""

from ..config import OCR_ENABLED
from ..db import get_connection, update_job
from ..pdf_extract import extract_pdf_pages
from ..pdf_ocr import convert_scanned_pdf_to_searchable_pdf
from .job_helpers import _count_pages_with_text, check_not_cancelled, download_job_pdf


def ingest_job_pdf(job):
    """Downloads, extracts, and OCRs (if needed) the PDF for `job`.

    Returns (pages, pdf_path, temp_pdf_paths, ocr_summary) - pdf_path may
    differ from the original download if OCR produced a replacement
    searchable PDF; temp_pdf_paths lists every temp file the caller is
    responsible for cleaning up (both the original download and, if
    produced, the OCR output).
    """
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

    # Previously gated on `len(pages) == 0` - back when extract_pdf_pages
    # dropped any page with no text layer entirely, that was the only way
    # to detect "this document has nothing OCR could help with". Now that
    # extract_pdf_pages returns an entry for every page (see its own
    # comment for why - those dropped pages used to be invisible to
    # vision routing too), `len(pages)` is just the page count and no
    # longer signals anything about text coverage. convert_scanned_pdf_to_
    # searchable_pdf now decides for itself, per page, whether there's
    # anything to OCR - including the common case of a MOSTLY text-based
    # exam PDF with a couple of image-only pages mixed in, which the old
    # whole-document gate never even attempted. It's cheap to call
    # unconditionally when OCR_ENABLED: it returns immediately with
    # converted=False if no page needs it.
    if OCR_ENABLED:
        with get_connection() as connection:
            update_job(
                connection,
                job["id"],
                status="running",
                stage="Converting scanned PDF with OCR",
                progress=35,
                summary={
                    "pagesWithText": _count_pages_with_text(pages),
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
                # Set only when there WAS a text-less page but Tesseract
                # isn't installed on this host (e.g. this Render deploy
                # today, which has no OCR system dependency configured) -
                # surfaced so that's visible in the job summary instead of
                # silently doing nothing. Vision-based extraction still
                # gets a shot at these pages independently of OCR.
                "skippedReason": ocr_result.skipped_reason,
                "error": None,
            }

            if ocr_result.output_path and ocr_result.converted:
                pdf_path = ocr_result.output_path
                temp_pdf_paths.append(pdf_path)
                pages = extract_pdf_pages(pdf_path)
        except Exception as error:
            # convert_scanned_pdf_to_searchable_pdf no longer raises for a
            # missing Tesseract install (that's the skipped_reason path
            # above) - this now only catches genuine unexpected failures
            # (a corrupt page image, a disk error writing the merged PDF,
            # etc.), which is why this can stay a broad catch: OCR is a
            # best-effort enhancement, never something a job should die
            # over.
            ocr_summary = {
                "enabled": True,
                "converted": False,
                "pagesOcrd": 0,
                "searchablePdfPath": None,
                "error": str(error),
            }

    # Genuinely nothing for the rest of the pipeline to work with: no page
    # has real text (OCR was off, unavailable, or found nothing) AND no
    # page even has an image/drawing for vision-based extraction to read
    # instead. Checked AFTER the OCR attempt (and using needsVision, not
    # just text) rather than the old pre-OCR `len(pages) == 0` check,
    # because a page with no text but a scanned image on it is exactly
    # what needsVision is for - that page doesn't need OCR to be
    # extractable, only a genuinely blank/corrupt page does.
    if _count_pages_with_text(pages) == 0 and not any(page.get("needsVision") for page in pages):
        # RuntimeError is deliberate: friendly_job_error_message (above)
        # renders RuntimeError messages verbatim to the uploader, same as
        # every other self-describing failure in this file.
        raise RuntimeError(
            "This PDF has no extractable content on any page - no text, "
            "no images, no diagrams. It may be corrupted, password "
            "protected in a way that strips content, or genuinely blank. "
            "Try re-exporting or re-scanning the file."
        )

    return pages, pdf_path, temp_pdf_paths, ocr_summary
