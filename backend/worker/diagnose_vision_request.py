"""
Standalone diagnostic - NOT part of the app pipeline.

Run this directly on the Windows machine that runs the worker:

    cd backend
    python -m worker.diagnose_vision_request

Unlike diagnose_connection.py (which sent a hand-built text-only request
and gave a misleading 429 because raw padded text is billed very
differently from image tokens), this script builds a synthetic 2-page
PDF with actual visual content, renders it at the SAME AI_PDF_RENDER_SCALE
the worker uses, and calls the REAL GeminiProvider.generate_json_from_pdf_images
method directly - the exact code path that produced the WinError 10053.
This should tell us definitively whether that error reproduces outside a
real job, and if so, expose the real HTTP status/body behind it.
"""

import time

import fitz

from .ai.gemini_provider import GeminiProvider
from .config import AI_PDF_RENDER_SCALE


def build_synthetic_pdf(path):
    """A realistic-ish 2-page 'question paper' page: dense text plus a
    diagram-like drawing (rectangles/lines/circles), so the rendered JPEG
    is a comparable size/complexity to a real scanned exam page - not a
    blank page that would compress to almost nothing."""
    doc = fitz.open()
    for page_index in range(2):
        page = doc.new_page(width=595, height=842)  # A4 in points
        # Dense-ish text block, like MCQ options.
        text = "\n".join(
            f"{page_index * 20 + q}. Sample question text filler content line for question {q}. "
            "(A) Option one  (B) Option two  (C) Option three  (D) Option four"
            for q in range(1, 21)
        )
        page.insert_textbox(fitz.Rect(40, 40, 555, 400), text, fontsize=10)
        # A "diagram": nested shapes with varying fill, roughly simulating
        # a circuit/geometry diagram so JPEG compression isn't trivial.
        shape = page.new_shape()
        for i in range(30):
            x = 40 + (i % 6) * 80
            y = 450 + (i // 6) * 60
            shape.draw_rect(fitz.Rect(x, y, x + 60, y + 40))
            shape.draw_circle((x + 30, y + 20), 15)
            shape.draw_line((x, y), (x + 60, y + 40))
        shape.finish(color=(0, 0, 0), fill=(0.8, 0.85, 0.9))
        shape.commit()
    doc.save(path)
    doc.close()


if __name__ == "__main__":
    pdf_path = "diagnostic_synthetic.pdf"
    build_synthetic_pdf(pdf_path)
    print(f"Built synthetic 2-page PDF at {pdf_path}")
    print(f"AI_PDF_RENDER_SCALE={AI_PDF_RENDER_SCALE}\n")

    provider = GeminiProvider()

    system_prompt = "You are extracting multiple-choice questions from exam page images."
    user_prompt = (
        "Return ONLY a JSON array of objects with fields: question_no, question_text, "
        "options, has_diagram, diagram_bbox, source_page."
    )

    start = time.time()
    results = provider.generate_json_from_pdf_images(
        system_prompt,
        user_prompt,
        pdf_path,
        page_numbers=[1, 2],
        on_progress=lambda done, total: print(f"  progress: chunk {done}/{total}"),
    )
    elapsed = time.time() - start

    print(f"\nDone in {elapsed:.1f}s\n")
    for r in results:
        print(f"Chunk {r['chunk_number']} (pages {r['start_page']}-{r['end_page']}):")
        if r["error"]:
            print(f"  ERROR: {r['error']}")
        else:
            print(f"  OK - response length {len(r['response_text'] or '')} chars")
            print(f"  page_images captured for pages: {list(r['page_images'].keys())}")
