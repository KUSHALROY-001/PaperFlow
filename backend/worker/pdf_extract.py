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

# A plain C/Java/Python snippet has none of the signals above (no raster
# image, no vector drawing, no math symbols) - it's just ordinary-looking
# text to this classifier, so it was falling through to the plain
# get_text("text") path below. That call flattens the page into a 1D
# stream and does NOT reliably reproduce a code block's original
# indentation (many source PDFs position each line via glyph coordinates
# rather than literal repeated space characters, which get_text("text")
# has no way to reconstruct) - the AI model then receives already-flattened
# text and has no visual layout left to preserve, no matter how firmly
# provider.py's system prompt tells it to preserve indentation "exactly as
# it appears on the page". Detecting likely code by its punctuation/keyword
# profile and routing those pages through vision instead - where the model
# actually sees the rendered indentation - fixes this at the source instead
# of asking a text-only extraction to recover information it never had.
CODE_KEYWORD_RE = re.compile(
    r"\b(?:#include|int\s+main|void\s+main|public\s+class|def\s+\w+\(|"
    r"import\s+\w+|for\s*\(|while\s*\(|printf|System\.out|console\.log)\b"
)
CODE_PUNCTUATION_DENSITY_THRESHOLD = 0.02

ANSWER_KEY_HEADING_RE = re.compile(r"(?im)^\s*answer\s*key\s*$")
ANSWER_KEY_LINE_RE = re.compile(r"(?m)^\s*(\d{1,4})\.\s*([A-Da-d])\s*$")
QUESTION_OPTION_MARKER_RE = re.compile(r"(?m)^\s*\([A-Da-d]\)")


def is_answer_key_page(text):
    """True when the page is a printed answer key, not question stems.

    Confirmed on IAF Group Y mock PDFs: the only pages with vector
    drawings were the answer-key tables (ruled lines around `1. A` /
    `21. D` cells). classify_page_content used to treat those rules as
    `needsVision`, so Gemini vision was asked to extract questions from
    a page that has no stems - and it invented filler like
    "Reasoning question 21" with options ["A","B","C","D"].
    """
    if not (text or "").strip():
        return False
    if ANSWER_KEY_HEADING_RE.search(text):
        return True
    key_lines = ANSWER_KEY_LINE_RE.findall(text)
    option_markers = QUESTION_OPTION_MARKER_RE.findall(text)
    return len(key_lines) >= 8 and len(option_markers) < 2


def parse_answer_key(text):
    """Map paper-local question number -> 'A'/'B'/'C'/'D' from a key page."""
    return {
        int(number): letter.upper()
        for number, letter in ANSWER_KEY_LINE_RE.findall(text or "")
    }


def _looks_like_code(text):
    if CODE_KEYWORD_RE.search(text):
        return True
    # Fallback for snippets that dodge every keyword above (e.g. a bare
    # pseudocode block) - braces/semicolons are rare in ordinary MCQ prose
    # but dense in almost any code snippet.
    punctuation_count = text.count("{") + text.count("}") + text.count(";")
    return (punctuation_count / max(len(text), 1)) > CODE_PUNCTUATION_DENSITY_THRESHOLD


def _point_xy(point):
    if hasattr(point, "x") and hasattr(point, "y"):
        return float(point.x), float(point.y)
    if isinstance(point, (tuple, list)) and len(point) >= 2:
        return float(point[0]), float(point[1])
    return None


def _is_table_rule_drawing(drawing):
    """Horizontal/vertical stroked line - a table border, not a diagram.

    Answer-key pages in generated exam PDFs are a grid of such rules
    (get_drawings() type 's', a single 'l' item). Counting those as
    hasVectorDrawings was the entire reason those pages were routed to
    vision while the actual question pages (no drawings) were not.
    """
    items = drawing.get("items") or []
    if drawing.get("type") != "s" or len(items) != 1:
        return False
    item = items[0]
    if not item or item[0] != "l" or len(item) < 3:
        return False
    p1 = _point_xy(item[1])
    p2 = _point_xy(item[2])
    if p1 is None or p2 is None:
        return False
    dx, dy = abs(p1[0] - p2[0]), abs(p1[1] - p2[1])
    return dx < 1.5 or dy < 1.5


def _has_diagram_drawings(page):
    drawings = page.get_drawings() or []
    return any(not _is_table_rule_drawing(drawing) for drawing in drawings)


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
    raw_drawing_count = len(page.get_drawings() or [])
    has_diagram_drawings = _has_diagram_drawings(page)
    is_answer_key = is_answer_key_page(text)

    math_symbol_count = len(MATH_SYMBOL_RE.findall(text))
    math_symbol_density = math_symbol_count / max(len(text), 1)

    # Answer keys must never go to vision: they have no stems, and the
    # model will invent "{section} question {n}" placeholders from the
    # printed pattern line / regex preview. Table-rule strokes also do
    # not count as diagrams - only real drawings do.
    needs_vision = (not is_answer_key) and (
        has_raster_images
        or has_diagram_drawings
        or math_symbol_density > MATH_SYMBOL_DENSITY_THRESHOLD
        or _looks_like_code(text)
    )

    return {
        "hasRasterImages": has_raster_images,
        "hasVectorDrawings": has_diagram_drawings,
        "rawVectorDrawingCount": raw_drawing_count,
        "mathSymbolDensity": round(math_symbol_density, 4),
        "isAnswerKey": is_answer_key,
        "needsVision": needs_vision,
    }


def extract_pdf_pages(file_path):
    # Returns one entry per PDF page, unconditionally - including pages
    # with NO text layer at all (text ends up as "" for those). This used
    # to skip any page that had no text, which quietly dropped it from
    # every downstream pass at once: not just the regex/text parser (fair
    # enough, there's no text to parse) but ALSO the vision pipeline in
    # ai/provider.py, which decides what needs vision by looking at THIS
    # function's output - a page that was never even in the list can never
    # be routed to vision either. On a real exam PDF that's mostly
    # text-layer pages with a handful of image-only inserts mixed in, that
    # meant those specific pages produced no error anywhere - they just
    # silently never existed to any part of the pipeline, and their
    # questions came back missing with no trail explaining why. Including
    # every page here fixes that at the source: classify_page_content
    # still runs per page and will flag a genuinely image-only page as
    # needsVision from its raster images / vector drawings, so it gets
    # picked up by the vision pass the same way any other needs-vision
    # page does, without requiring OCR to have run first.
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Uploaded PDF not found: {path}")

    pages = []
    with fitz.open(path) as document:
        for index, page in enumerate(document, start=1):
            text = page.get_text("text") or ""
            page_entry = {"page": index, "text": text}
            page_entry.update(classify_page_content(page))
            pages.append(page_entry)

    return pages
