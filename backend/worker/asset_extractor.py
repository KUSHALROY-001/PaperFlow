"""
Converts a model-reported diagram bounding box into pixel coordinates
against the EXACT page image the vision model was shown, then crops and
encodes it as PNG bytes.

Coordinate convention: normalized 0-1000 [ymin, xmin, ymax, xmax], matching
Gemini's own object-detection convention (see provider.py's SYSTEM_PROMPT
for the exact wording that instructs the model to use it). Matching a
convention the model already has real training behind is safer than
inventing a new one and hoping the model follows it consistently.

Cropping is done via Pillow rather than PyMuPDF's own Pixmap-cropping
constructors, which vary across PyMuPDF versions and aren't consistently
available - re-encoding through PNG bytes + PIL is slightly less direct
but is stable across versions and easy to unit test without any PDF/API
dependency at all (see the docstring on crop_diagram).

This module never raises on malformed input - a bad bounding box from the
model means "skip this crop", not "crash extraction".
"""

import io
from pathlib import Path

from PIL import Image


def build_diagram_storage_path(pdf_path, question_id):
    """
    Mirrors pdf_ocr.py#build_ocr_pdf_path's existing convention exactly
    (a sibling directory next to the source PDF, not a path invented from
    scratch) - .../uploads/{workspace}/{mockTestId}/{uploadedFileId}/diagrams/{question_id}.png,
    the same base layout as .../ocr/{name}.searchable.pdf already uses one
    directory over.

    This is the ONLY file written per diagram (see migration
    022_diagram_single_image.sql, reversing migration 014's separate
    "immutable original" sibling file) - question_assets.storage_path,
    both the file currently served AND the one any future crop is derived
    from.
    """
    source_path = Path(pdf_path)
    diagrams_dir = source_path.parent / "diagrams"
    diagrams_dir.mkdir(parents=True, exist_ok=True)
    return diagrams_dir / f"{question_id}.png"


def normalized_bbox_to_pixels(bbox_normalized, pixel_width, pixel_height):
    """
    bbox_normalized: [ymin, xmin, ymax, xmax], each expected in 0-1000,
    per Gemini's object-detection convention.

    Returns (x0, y0, x1, y1) in pixel coordinates, or None if the box is
    malformed (wrong shape, non-numeric) or degenerate (zero/negative
    area after clamping into range and rounding to pixels).
    """
    if not isinstance(bbox_normalized, (list, tuple)) or len(bbox_normalized) != 4:
        return None

    try:
        ymin, xmin, ymax, xmax = (float(value) for value in bbox_normalized)
    except (TypeError, ValueError):
        return None

    # Clamp into [0, 1000] rather than rejecting outright - a model
    # reporting 1003 instead of 1000 shouldn't lose the whole crop over a
    # rounding-adjacent overshoot.
    ymin, xmin, ymax, xmax = (max(0.0, min(1000.0, value)) for value in (ymin, xmin, ymax, xmax))

    if xmax <= xmin or ymax <= ymin:
        return None

    x0 = round(xmin / 1000 * pixel_width)
    y0 = round(ymin / 1000 * pixel_height)
    x1 = round(xmax / 1000 * pixel_width)
    y1 = round(ymax / 1000 * pixel_height)

    if x1 <= x0 or y1 <= y0:
        return None

    return x0, y0, x1, y1


def _apply_padding(x0, y0, x1, y1, pixel_width, pixel_height, padding_pct, min_padding_px):
    width = x1 - x0
    height = y1 - y0
    # Percentage-based padding alone shrinks to almost nothing for a
    # small or tightly-drawn box - exactly the case where a model's
    # bbox estimate is least precise. Taking whichever is LARGER of the
    # percentage and a flat pixel floor means a small diagram still gets
    # a meaningful, visible margin instead of a few sub-pixel-rounded px.
    pad_x = max(round(width * padding_pct), min_padding_px)
    pad_y = max(round(height * padding_pct), min_padding_px)

    return (
        max(0, x0 - pad_x),
        max(0, y0 - pad_y),
        min(pixel_width, x1 + pad_x),
        min(pixel_height, y1 + pad_y),
    )


def crop_diagram(
    pixmap_png_bytes,
    pixmap_width,
    pixmap_height,
    bbox_normalized,
    *,
    # Bumped from 0.03 (3%) -> 0.10 (10%) after real-world review showed
    # most crops from 3% clipped part of the actual diagram - vision
    # model bounding boxes are estimates, not pixel-precise detections.
    # Bumped again from 0.10 -> 0.25 so the crop is deliberately
    # oversized (final size = original + 2*padding_pct = 1.5x the
    # detected box in each dimension) rather than just "safely padded" -
    # the intent is no longer just "don't clip the diagram", it's "leave
    # enough surrounding room that a user can manually crop the result
    # down to whatever tighter final size they actually want", per the
    # manual-crop-tool feature. A crop with generous extra margin is
    # still useful and now expected; a crop missing part of the actual
    # figure still usually isn't.
    padding_pct=0.25,
    # Flat floor so a small diagram (where padding_pct alone would round
    # to just 1-2px) still gets a real margin. Chosen relative to a
    # typical AI_PDF_RENDER_SCALE=1.5 page render (roughly 900-1300px
    # per dimension) - large enough to matter, small enough not to
    # noticeably bloat a normal-sized crop.
    min_padding_px=18,
):
    """
    pixmap_png_bytes: PNG bytes of the FULL PAGE IMAGE already rendered
    for the vision call (pixmap.tobytes("png") on the exact pixmap shown
    to the model - see gemini_provider.py#generate_json_from_pdf_images).
    Using the same render the model saw is what keeps the coordinate math
    correct - a separately re-rendered page (different scale, different
    render pass) would not line up with the model's reported box.
    pixmap_width / pixmap_height: pixel dimensions of that same pixmap.
    bbox_normalized: [ymin, xmin, ymax, xmax], 0-1000, per Gemini's
    convention.
    padding_pct: fraction of the box's own width/height added on each
    side before cropping.
    min_padding_px: flat pixel floor for that same padding, whichever of
    the two is larger wins - see rationale in the parameter default
    above.

    Returns PNG bytes of the cropped region, or None if the box is
    malformed/degenerate or the image data can't be decoded - callers
    must treat None as "skip this crop, keep the question text-only",
    never as a reason to fail the whole extraction.
    """
    pixel_bbox = normalized_bbox_to_pixels(bbox_normalized, pixmap_width, pixmap_height)
    if pixel_bbox is None:
        return None

    x0, y0, x1, y1 = _apply_padding(
        *pixel_bbox, pixmap_width, pixmap_height, padding_pct, min_padding_px
    )

    try:
        with Image.open(io.BytesIO(pixmap_png_bytes)) as image:
            cropped = image.crop((x0, y0, x1, y1))
            output = io.BytesIO()
            cropped.save(output, format="PNG")
            return output.getvalue()
    except Exception:
        return None