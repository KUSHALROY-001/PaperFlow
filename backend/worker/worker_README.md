# PaperFlow OCR Worker

This worker processes queued `processing_jobs`.

## Concurrency

Multiple jobs (e.g. different users' PDF uploads) are processed in parallel
**threads within one worker process** - controlled by `WORKER_CONCURRENCY`
(default `4`), or `--concurrency` on the CLI. A job's non-AI work
(download, OCR, parsing, DB writes) can now overlap with other jobs
instead of queueing behind them.

This does **not** raise how many requests/minute reach OpenAI/Gemini.
`AI_MAX_REQUESTS_PER_MINUTE` is still enforced by a single shared limiter
(see `ai/gemini_provider.py`) that every thread in the process waits on
before making a call - so all jobs' AI calls, no matter how many run
concurrently, are still paced through one 15-req/min (or whatever you set)
gateway. Raising `WORKER_CONCURRENCY` only lets more jobs make *progress*
at once; it doesn't let more AI requests through per minute.

**Important:** that shared limiter is per-*process*. If you ever run more
than one worker process/container at the same time against the same API
key (as opposed to raising `WORKER_CONCURRENCY` within one process), each
process gets its own counter and the real combined request rate becomes
`(number of processes) x AI_MAX_REQUESTS_PER_MINUTE` - which can blow past
your quota. Scale by raising `WORKER_CONCURRENCY`/`--concurrency`, not by
running multiple worker processes, unless the limiter is moved to shared
storage first.

Current behavior:

1. Claims queued jobs using `FOR UPDATE SKIP LOCKED` (safe for concurrent
   claimers - a claimed job can never be picked up twice).
2. Downloads the uploaded PDF from Backblaze B2 (via `processing_jobs.input_config.storageKey`) to a local temp file for the duration of the job.
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
