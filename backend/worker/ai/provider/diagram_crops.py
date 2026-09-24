"""Crops each extracted question's diagram bounding boxes out of the
source page images and attaches them as question assets. Split out of
provider.py - see backend/worker/ARCHITECTURE.md.
"""

from ...asset_extractor import crop_diagram

def _attach_diagram_crops(ai_questions, page_images):
    """
    Crop every entry in a question's `diagrams` list from the page image
    used for its vision call and attach successful PNGs as transient
    `_diagram_crops`, keyed by slot_key.

    This key is NOT part of the question schema - it's a transient
    carrier consumed by db_questions.py#replace_questions when saving the file to
    disk, and must be stripped before a question dict is ever serialized
    into output_summary or any other JSON column (raw image bytes don't
    belong there). worker.py is responsible for stripping it after saving.

    Returns a stats dict - not just silently succeeding/failing per
    question. Losing this observability once already cost real debugging
    time: with no trace of why a requested diagram ended
    up with no crop (source_page mismatch, missing page_images because
    that chunk's fetch failed, or a bad/degenerate bbox), the only way to
    find out was writing standalone diagnostic scripts against a live
    account. Surfacing these counts in output_summary means the very next
    job's own summary answers "did the model even try, and if so where
    did it fail" without needing to reproduce anything.
    """
    stats = {"flaggedByModel": 0, "cropped": 0, "noMatchingPageImage": 0, "cropFailed": 0}

    for question in ai_questions:
        diagrams = question.get("diagrams") or []
        if not diagrams:
            continue

        source_page = question.get("source_page")
        page_image = page_images.get(source_page) if source_page else None
        if page_image is None and source_page and len(page_images) > 1:
            # The model was explicitly told to use the ABSOLUTE PDF page
            # number for source_page (see SYSTEM_PROMPT and the per-chunk
            # prompt in gemini_provider.py), and does so correctly for
            # the large majority of chunks - but real-world testing
            # against a full document showed it occasionally reverts to
            # POSITION-WITHIN-THIS-CHUNK instead (1st image, 2nd image...)
            # for an entire chunk at a time, seemingly at random, with no
            # single prompt tweak having fully eliminated it. Recovering
            # from it here is more robust than chasing prompt wording
            # further: if source_page isn't a real page in this chunk but
            # IS a valid 1-based index into the chunk's own pages (sorted
            # ascending, matching the order pages were actually attached
            # to the request), treat that as the likely intended page
            # rather than discarding a diagram the model DID correctly
            # locate and box, just under the wrong page-numbering
            # convention.
            chunk_pages_sorted = sorted(page_images.keys())
            if 1 <= source_page <= len(chunk_pages_sorted):
                page_image = page_images[chunk_pages_sorted[source_page - 1]]
        if page_image is None:
            # Model didn't report a usable source_page for this question,
            # or it doesn't match any page actually in this chunk (and
            # isn't a valid position-in-chunk index either) - fall back
            # to the chunk's own single page if it only covered one,
            # otherwise there's no sane page to crop from.
            if len(page_images) == 1:
                page_image = next(iter(page_images.values()))
            else:
                stats["flaggedByModel"] += len(diagrams)
                stats["noMatchingPageImage"] += len(diagrams)
                continue

        crops = {}
        for diagram in diagrams:
            stats["flaggedByModel"] += 1
            crop_bytes = crop_diagram(
                page_image["png_bytes"],
                page_image["width"],
                page_image["height"],
                diagram["bbox"],
            )
            if crop_bytes:
                crops[diagram["slot_key"]] = crop_bytes
                stats["cropped"] += 1
            else:
                stats["cropFailed"] += 1

        if crops:
            question["_diagram_crops"] = crops

    return stats


