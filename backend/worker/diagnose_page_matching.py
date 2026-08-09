"""
Standalone diagnostic - NOT part of the app pipeline.

Run this directly, from inside backend/:

    cd backend
    python -m worker.diagnose_page_matching "C:\\path\\to\\your\\full.pdf"

Runs the REAL vision extraction across every page needing it (same as a
real job), and for every question the model flags has_diagram=true on,
prints its reported source_page against the actual page numbers present
in that chunk. This tells us definitively whether noMatchingPageImage is
caused by: the model misreporting source_page (and how, e.g. off-by-N
suggesting position-within-chunk instead of absolute page number), the
model omitting it entirely, or something else.
"""

import sys

from .ai.gemini_provider import GeminiProvider
from .ai.provider import SYSTEM_PROMPT, build_pdf_prompt, _attach_diagram_crops
from .ai.schemas import extract_json_payload, normalize_ai_questions
from .pdf_extract import extract_pdf_pages


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m worker.diagnose_page_matching <path-to-pdf>")

    pdf_path = sys.argv[1]

    pages = extract_pdf_pages(pdf_path)
    vision_pages = sorted({p["page"] for p in pages if p.get("needsVision")})
    print(f"Pages needing vision: {vision_pages}\n")

    provider = GeminiProvider()
    chunk_results = provider.generate_json_from_pdf_images(
        SYSTEM_PROMPT,
        build_pdf_prompt([]),
        pdf_path,
        page_numbers=vision_pages,
        on_progress=lambda done, total: print(f"  progress: chunk {done}/{total}"),
    )

    total_flagged = 0
    total_mismatched = 0

    for result in chunk_results:
        chunk_pages_available = sorted(result.get("page_images", {}).keys())
        print(f"=== Chunk pages {result['start_page']}-{result['end_page']} (page_images available: {chunk_pages_available}) ===")

        if result["error"]:
            print(f"  ERROR: {result['error']}\n")
            continue

        try:
            payload = extract_json_payload(result["response_text"])
            ai_questions = normalize_ai_questions(payload, source="diagnostic")
        except Exception as e:
            print(f"  Failed to parse: {e}\n")
            continue

        flagged = [q for q in ai_questions if q["has_diagram"]]
        if not flagged:
            print("  (no diagrams flagged in this chunk)\n")
            continue

        # Call the REAL, patched _attach_diagram_crops directly - this
        # diagnostic used to do its own simplified `source_page in
        # chunk_pages_available` check instead, which is why it kept
        # showing "NO MATCH" even after the position-in-chunk fallback
        # was added to provider.py: that check never actually ran the
        # real matching code at all. This now reports exactly what a
        # real job would.
        chunk_stats = _attach_diagram_crops(ai_questions, result.get("page_images") or {})
        for q in flagged:
            total_flagged += 1
            crop_attempted = "_diagram_crop_bytes" in q
            if not crop_attempted:
                total_mismatched += 1
            status = "OK (crop attempted)" if crop_attempted else "*** STILL NO MATCH ***"
            print(f"  q{q['question_no']}: source_page={q['source_page']} {status}")
        print(f"  chunk diagram_stats: {chunk_stats}\n")

    print(f"--- Summary: {total_flagged} diagrams flagged, {total_mismatched} had no matching page_image ---")