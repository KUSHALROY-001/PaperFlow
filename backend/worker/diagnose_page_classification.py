"""
Standalone diagnostic - NOT part of the app pipeline.

Run this directly on the Windows machine, from inside backend/:

    cd backend
    python -m worker.diagnose_page_classification "C:\\path\\to\\your\\test.pdf"

Prints classify_page_content()'s raw signals for every page, so we can
see definitively whether a diagram-bearing page is (or isn't) being
flagged needsVision - and if not, exactly which of the three signals
(raster images, vector drawings, math symbol density) failed to catch it.
"""

import sys

import fitz

from .pdf_extract import classify_page_content


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m worker.diagnose_page_classification <path-to-pdf>")

    pdf_path = sys.argv[1]

    with fitz.open(pdf_path) as document:
        print(f"{document.page_count} page(s) in {pdf_path}\n")
        for index, page in enumerate(document, start=1):
            signals = classify_page_content(page)
            text = page.get_text("text") or ""
            raw_images = page.get_images(full=True)
            raw_drawings = page.get_drawings()

            print(f"--- Page {index} ---")
            print(f"  needsVision:        {signals['needsVision']}")
            print(f"  hasRasterImages:     {signals['hasRasterImages']}  (raw get_images(full=True) count: {len(raw_images)})")
            print(f"  hasVectorDrawings:   {signals['hasVectorDrawings']}  (raw get_drawings() count: {len(raw_drawings)})")
            print(f"  mathSymbolDensity:   {signals['mathSymbolDensity']}")
            print(f"  text length:         {len(text)} chars")
            if raw_images:
                for img in raw_images[:5]:
                    print(f"    image xref={img[0]} smask={img[1]} width={img[2]} height={img[3]}")
            print()
