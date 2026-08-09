import re
from pathlib import Path

import fitz

# Used to flag a page as needing vision extraction even when it has a
# perfectly good text layer (so was_scanned=False) - a JEE-style PDF often
# mixes plain-text questions with circuit diagrams, graphs, and dense
# equations on the SAME page as normal text, and none of that survives
# PyMuPDF's plain get_text("text") call. Reused directly in a formula since
# a real MCQ question stem is rarely much denser than this in ordinary math
# notation.
MATH_SYMBOL_RE = re.compile(
    r"[∫∮∑∏√±÷×≤≥≠≈∞∂∇∆αβγδθλμπσφω]"
    r"|[\u2070-\u209F]"  # sub/superscript block
    r"|[\u2200-\u22FF]"  # mathematical operators block
)

MATH_SYMBOL_DENSITY_THRESHOLD = 0.01


def classify_page_content(page):
    """
    page is a fitz.Page. Returns the signals used to decide whether this
    page needs vision-based extraction instead of (or alongside) plain
    text extraction, plus a resulting needs_vision flag.

    get_drawings() matters more than it looks - a lot of exam diagrams
    (circuits, geometric figures, graphs) are drawn as vector paths in the
    PDF, not embedded raster images, so get_images() alone misses them
    entirely.

    get_images(full=True) rather than the default full=False - the default
    can miss images referenced indirectly through a nested Form XObject,
    which is how some document converters (Google Docs/Word "Save as
    PDF") embed pasted images. full=True costs a bit more work per page
    but is the documented, more complete mode.
    """
    text = page.get_text("text") or ""
    has_raster_images = len(page.get_images(full=True)) > 0
    has_vector_drawings = len(page.get_drawings()) > 0

    math_symbol_count = len(MATH_SYMBOL_RE.findall(text))
    math_symbol_density = math_symbol_count / max(len(text), 1)

    needs_vision = (
        has_raster_images
        or has_vector_drawings
        or math_symbol_density > MATH_SYMBOL_DENSITY_THRESHOLD
    )

    return {
        "hasRasterImages": has_raster_images,
        "hasVectorDrawings": has_vector_drawings,
        "mathSymbolDensity": round(math_symbol_density, 4),
        "needsVision": needs_vision,
    }


def extract_pdf_pages(file_path):
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Uploaded PDF not found: {path}")

    pages = []
    with fitz.open(path) as document:
        for index, page in enumerate(document, start=1):
            text = page.get_text("text")
            if text and text.strip():
                page_entry = {"page": index, "text": text}
                page_entry.update(classify_page_content(page))
                pages.append(page_entry)

    return pages