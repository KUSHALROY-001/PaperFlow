from dataclasses import dataclass
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

from .config import OCR_LANGUAGE, OCR_RENDER_DPI, TESSERACT_CMD

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


@dataclass
class OcrResult:
    converted: bool
    output_path: Path | None
    pages_ocrd: int
    pages_with_text_before_ocr: int


def build_ocr_pdf_path(source_path):
    source_path = Path(source_path)
    ocr_dir = source_path.parent / "ocr"
    ocr_dir.mkdir(parents=True, exist_ok=True)
    return ocr_dir / f"{source_path.stem}.searchable.pdf"


def assert_tesseract_available():
    try:
        pytesseract.get_tesseract_version()
    except Exception as error:
        raise RuntimeError(
            "Tesseract OCR is not installed or is not available on PATH. "
            "Install Tesseract, then restart the backend. On Windows, install "
            "UB Mannheim Tesseract and add its installation folder to PATH."
        ) from error


def count_pages_with_text(pdf_path):
    pages_with_text = 0
    with fitz.open(pdf_path) as document:
        for page in document:
            if page.get_text("text").strip():
                pages_with_text += 1
    return pages_with_text


def convert_scanned_pdf_to_searchable_pdf(source_path):
    source_path = Path(source_path)
    pages_with_text = count_pages_with_text(source_path)

    if pages_with_text > 0:
        return OcrResult(
            converted=False,
            output_path=source_path,
            pages_ocrd=0,
            pages_with_text_before_ocr=pages_with_text,
        )

    assert_tesseract_available()

    output_path = build_ocr_pdf_path(source_path)
    searchable_document = fitz.open()
    pages_ocrd = 0
    zoom = OCR_RENDER_DPI / 72

    with fitz.open(source_path) as source_document:
        for page in source_document:
            pixmap = page.get_pixmap(
                matrix=fitz.Matrix(zoom, zoom),
                alpha=False,
            )
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
            pages_ocrd += 1

    searchable_document.save(output_path, garbage=4, deflate=True)
    searchable_document.close()

    return OcrResult(
        converted=True,
        output_path=output_path,
        pages_ocrd=pages_ocrd,
        pages_with_text_before_ocr=pages_with_text,
    )
