# PaperFlow OCR Worker

This worker processes queued `processing_jobs`.

Current behavior:

1. Claims one queued job using `FOR UPDATE SKIP LOCKED`.
2. Reads the uploaded PDF path from `uploaded_files.metadata.localPath`.
3. Extracts PDF text with PyMuPDF.
4. If the PDF has no selectable text, optionally converts it to a searchable PDF with Tesseract OCR.
5. Parses simple MCQ patterns using regex.
6. Optionally sends extracted text chunks to OpenAI or Gemini for JSON cleanup.
7. Replaces questions for the target mock test.
8. Inserts `question_options`.
9. Marks the job `completed` or `failed`.
10. Updates the mock test status to `review` when questions are found.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r worker\requirements.txt
```

For scanned PDFs, install the Tesseract OCR executable too. On Windows, install the UB Mannheim Tesseract build, then add the install folder to PATH and restart your terminal/backend.

OCR config:

```env
OCR_ENABLED=true
OCR_LANGUAGE=eng
OCR_RENDER_DPI=220
TESSERACT_CMD=
```

If Tesseract is installed but not on PATH, set `TESSERACT_CMD` to the full executable path, for example:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

## Optional AI Cleanup

The worker runs without AI by default. To enable AI cleanup, set one provider in `backend\.env`:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-5
OPENAI_API_KEY=your_openai_key
```

or:

```env
AI_PROVIDER=gemini
AI_MODEL=gemini-flash-latest
GEMINI_API_KEY=your_gemini_key
```

The API key is used only by the Python worker. Never expose it in frontend `.env` files.

## Run Once

```bash
python -m worker.worker --once
```

## Run Continuously

```bash
python -m worker.worker
```

## Supported PDF Pattern

The first parser expects common MCQ text like:

```txt
1. Which keyword declares a constant?
A. const
B. let
C. var
D. static
Answer: A
```

Scanned image-only PDFs are converted to searchable PDFs with Tesseract when `OCR_ENABLED=true`. If Tesseract is unavailable, the worker falls back to the AI image/PDF flow where possible.
