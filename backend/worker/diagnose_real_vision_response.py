"""
Standalone diagnostic - NOT part of the app pipeline.

Run this directly on the Windows machine, from inside backend/:

    cd backend
    python -m worker.diagnose_real_vision_response "C:\\path\\to\\your\\test.pdf"

Calls the REAL provider.py extraction path (build_pdf_prompt + SYSTEM_PROMPT
+ GeminiProvider.generate_json_from_pdf_images) against your actual PDF and
prints the raw response text plus normalized question count, so we can see
exactly what the model returned - specifically whether it returned any
diagram entries - instead of only seeing the post-merge
summary.
"""

import sys

from .ai.gemini_provider import GeminiProvider
from .ai.provider import SYSTEM_PROMPT, build_pdf_prompt, _attach_diagram_crops
from .ai.schemas import extract_json_payload, normalize_ai_questions
from .pdf_extract import extract_pdf_pages


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m worker.diagnose_real_vision_response <path-to-pdf>")

    pdf_path = sys.argv[1]

    pages = extract_pdf_pages(pdf_path)
    vision_pages = sorted({p["page"] for p in pages if p.get("needsVision")})
    print(f"Pages needing vision: {vision_pages}\n")

    provider = GeminiProvider()
    chunk_results = provider.generate_json_from_pdf_images(
        SYSTEM_PROMPT,
        build_pdf_prompt([]),  # no regex hints available in this standalone script
        pdf_path,
        page_numbers=vision_pages,
        on_progress=lambda done, total: print(f"  progress: chunk {done}/{total}"),
    )

    for result in chunk_results:
        print(f"=== Chunk pages {result['start_page']}-{result['end_page']} ===")
        if result["error"]:
            print(f"ERROR: {result['error']}")
            continue

        raw = result["response_text"] or ""
        print(f"Raw response length: {len(raw)} chars")
        print("--- First 3000 chars of raw response ---")
        print(raw[:3000])
        print("--- end excerpt ---\n")

        try:
            payload = extract_json_payload(raw)
            ai_questions = normalize_ai_questions(payload, source="diagnostic")
            print(f"Normalized questions: {len(ai_questions)}")
            for q in ai_questions:
                print(
                    f"  q{q['question_no']}: diagrams={q['diagrams']} "
                    f"source_page={q['source_page']}"
                )
            stats = _attach_diagram_crops(ai_questions, result.get("page_images") or {})
            print(f"diagram_stats for this chunk: {stats}")
        except Exception as e:
            print(f"Failed to parse/normalize: {e}")
        print()
