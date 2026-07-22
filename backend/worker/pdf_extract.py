from pathlib import Path

import fitz


def extract_pdf_pages(file_path):
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Uploaded PDF not found: {path}")

    pages = []
    with fitz.open(path) as document:
        for index, page in enumerate(document, start=1):
            text = page.get_text("text")
            if text and text.strip():
                pages.append({"page": index, "text": text})

    return pages
