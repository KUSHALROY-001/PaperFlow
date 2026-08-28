from dataclasses import dataclass
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

from .config import OCR_LANGUAGE, OCR_RENDER_DPI, TESSERACT_CMD

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# Cached at module scope after the first check. pytesseract.get_tesseract_
# version() spawns a subprocess, and OCR is now evaluated on every job that
# has ANY page missing a text layer (see convert_scanned_pdf_to_searchable_
# pdf below) instead of only the rare fully-blank document - so on a host
# where Tesseract was never installed (e.g. a Render deploy with no OCR
# system dependency configured, which is the actual situation today), this
# subprocess call would otherwise fail on every single job. Caching the
# result for the life of this worker process turns that into one wasted
# check instead of one per job. None = not checked yet, True/False = cached.
_tesseract_available = None


def is_tesseract_available():
    global _tesseract_available
    if _tesseract_available is None:
        try:
            pytesseract.get_tesseract_version()
            _tesseract_available = True
        except Exception:
            _tesseract_available = False
    return _tesseract_available


@dataclass
class OcrResult:
    converted: bool
    output_path: Path | None
    pages_ocrd: int
    pages_with_text_before_ocr: int
    # Set only when there WAS OCR-able work to do but it couldn't run (no
    # Tesseract on this host) - distinct from "nothing needed OCR at all".
    # Surfaced in the job summary so a missing-Tesseract deploy is visible
    # in the UI instead of silently doing nothing, while still letting the
    # job proceed (vision-based extraction can still cover these pages).
    skipped_reason: str | None = None


def build_ocr_pdf_path(source_path):
    source_path = Path(source_path)
    ocr_dir = source_path.parent / "ocr"
    ocr_dir.mkdir(parents=True, exist_ok=True)
    return ocr_dir / f"{source_path.stem}.searchable.pdf"


def _find_pages_missing_text(pdf_path):
    """
    Returns (missing_page_indexes, total_page_count). missing_page_indexes
    is 0-indexed (matches fitz's own page indexing) - the pages that have
    no extractable text layer at all, regardless of how many OTHER pages
    in the same document DO have one. A real exam PDF is often mixed: most
    pages have a genuine text layer, but a handful (a photocopied insert,
    a diagram-only page) don't - those are exactly the pages this targets.
    """
    missing = []
    with fitz.open(pdf_path) as document:
        total = document.page_count
        for index, page in enumerate(document):
            if not (page.get_text("text") or "").strip():
                missing.append(index)
    return missing, total


def convert_scanned_pdf_to_searchable_pdf(source_path):
    """
    Runs OCR on exactly the pages that have no text layer, leaving every
    page that already has real text completely untouched, and merges the
    result into one searchable PDF with the original page order preserved.

    This used to gate on the WHOLE document having zero text pages before
    doing anything (`if pages_with_text > 0: return converted=False`) -
    a single page with real text anywhere in the file meant OCR never ran
    at all, even for other pages in the same document with no text layer
    whatsoever. Combined with pdf_extract.extract_pdf_pages previously
    dropping any page with no text before it ever became a `page` dict,
    those specific pages were invisible to the entire rest of the
    pipeline - not routed to vision, not OCR'd, not text-parsed, just
    silently absent with no error anywhere. extract_pdf_pages no longer
    drops them (every page gets a dict now, so vision routing can pick
    them up on its own via needsVision), and this function now OCRs them
    directly as an additional, independent text-source fallback for the
    same pages, rather than only working when literally nothing else in
    the document has text.

    Safe when Tesseract isn't installed (e.g. this Render deploy today,
    which has no Tesseract system dependency configured): checks
    availability once via is_tesseract_available() and returns
    converted=False with skipped_reason set instead of raising. This can
    now run on every job with any text-less page rather than only the
    rare fully-scanned document, so it needs to degrade quietly instead
    of throwing an exception (that the caller then has to catch) every
    single time.
    """
    source_path = Path(source_path)
    missing_page_indexes, total_pages = _find_pages_missing_text(source_path)
    pages_with_text_before_ocr = total_pages - len(missing_page_indexes)

    if not missing_page_indexes:
        return OcrResult(
            converted=False,
            output_path=source_path,
            pages_ocrd=0,
            pages_with_text_before_ocr=pages_with_text_before_ocr,
        )

    if not is_tesseract_available():
        return OcrResult(
            converted=False,
            output_path=source_path,
            pages_ocrd=0,
            pages_with_text_before_ocr=pages_with_text_before_ocr,
            skipped_reason=(
                f"Tesseract OCR is not installed on this server - "
                f"{len(missing_page_indexes)} page(s) with no text layer "
                "could not be OCR'd. Vision-based extraction will still "
                "be attempted for these pages."
            ),
        )

    output_path = build_ocr_pdf_path(source_path)
    searchable_document = fitz.open()
    zoom = OCR_RENDER_DPI / 72
    missing_set = set(missing_page_indexes)

    with fitz.open(source_path) as source_document:
        for index, page in enumerate(source_document):
            if index not in missing_set:
                # Already has a real text layer - copy the original page
                # through untouched rather than re-rendering it through
                # OCR, which would only ever produce a lossier version of
                # text that's already there.
                searchable_document.insert_pdf(source_document, from_page=index, to_page=index)
                continue

            pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            image = Image.frombytes(
                "RGB",
                (pixmap.width, pixmap.height),
                pixmap.samples,
            )
            page_pdf_bytes = pytesseract.image_to_pdf_or_hocr(
                image,
                extension="pdf",
                lang=OCR_LANGUAGE,
            )
            page_pdf = fitz.open("pdf", page_pdf_bytes)
            searchable_document.insert_pdf(page_pdf)
            page_pdf.close()

    searchable_document.save(output_path, garbage=4, deflate=True)
    searchable_document.close()

    return OcrResult(
        converted=True,
        output_path=output_path,
        pages_ocrd=len(missing_page_indexes),
        pages_with_text_before_ocr=pages_with_text_before_ocr,
    )