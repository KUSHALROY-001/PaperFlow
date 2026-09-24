# PaperFlow worker — file map

What each file in `backend/worker/` is for, so a new team member can find
the right place to make a change without reading everything first. This
complements `README.md`/`worker_README.md` (setup + run instructions) —
this file is about *where things live*, not how to run them.

## Layout

```
backend/worker/
  worker/                  job loop (process_job, process_generation_job, run_once/run_forever)
    worker.py
    job_helpers.py
    job_pdf_intake.py
    job_duplicate_handling.py
  db/                      all direct Postgres access, split by domain
    db_connection.py
    db_jobs.py
    db_questions.py
    db_duplicates.py
  ai/                      AI provider integration
    gemini_provider.py
    openai_provider.py
    schema/                response schemas + JSON parsing/repair + normalization
      response_schemas.py
      json_repair.py
      question_normalization.py
    provider/               the extraction/generation pipeline itself
      provider.py
      notes_generation.py
      topic_batching.py
      metadata_generation.py
      duplicate_regeneration.py
      diagram_crops.py
      question_matching.py
      marking_scheme.py
      template_generation.py
  http_server.py           run-as-a-web-service entry point (not split)
  config.py, db (see above), pdf_extract.py, question_parser.py, pdf_ocr.py,
  reconcile.py, duplicate_detector.py, asset_extractor.py, storage.py,
  cloudinary_storage.py, placeholders.py, grading.py, diagnose_*.py,
  *_selftest.py
```

Every subpackage above (`worker/worker/`, `worker/db/`, `worker/ai/`,
`worker/ai/schema/`, `worker/ai/provider/`) has an `__init__.py` that
re-exports its public surface, the same pattern `ai/__init__.py` already
used before any of this split happened. That's what keeps most of this
invisible to everything outside the subpackage that got split — `from .db
import get_connection` and `from .ai import enhance_questions_with_ai`
read identically to how they did when `db.py` and `ai/provider.py` were
each a single file; only the files that live *inside* a split subpackage
needed their own relative-import depth adjusted.

**Running the worker changed**: `backend/worker/` was already a Python
package named `worker` (run via `python -m worker.worker`), so nesting
`worker.py` into its own `worker/` subfolder makes the module path
`python -m worker.worker.worker`. `package.json`'s `worker`/`worker:once`
scripts and both READMEs were updated to match — **if your Render
deployment's start command references `worker.worker` directly, that
needs the same update on Render's dashboard, which lives outside this
repo and nothing here can update it for you.**

## `ai/provider/` — the extraction/generation pipeline

Split (2026) out of a single `provider.py` that had grown to hold
seven-plus unrelated features. `ai/provider/__init__.py` re-exports this
subpackage's public surface, and `ai/__init__.py` imports from *that* —
so nothing outside `ai/` ever needed to know this split happened.

| File | Responsible for | Constraints / gotchas |
|---|---|---|
| **`provider.py`** | The core PDF-extraction pipeline: chunking page text (`chunk_pages`), building the extraction prompt (`build_user_prompt`, `build_pdf_prompt`), running the AI call(s) and reconciling the result against the regex parser's output (`_enhance_questions_with_ai_inner`), and the public entry point (`enhance_questions_with_ai`). Also `get_provider()` (picks Gemini vs OpenAI from `AI_PROVIDER`) and `_build_syllabus_guidance`/`_check_template_match` (template-context matching for "Apply Template" jobs). | Imports from most of the files below — it's the orchestrator, everything else is a dependency of it, not the other way around. If you're adding a new step to the main extraction flow, it goes here. |
| **`notes_generation.py`** | Study-notes → new-question generation (`generate_questions_from_notes`). Notes have no pre-written questions, so this uses a distinct system prompt (`GENERATION_SYSTEM_PROMPT`) from the extraction one in `provider.py`. Includes the question-count spreading logic (`_spread_indices`, `_allocate_counts`, `_spread_keep`, `_normalize_desired_count`) that lets a user request a specific total and have it distributed evenly across the whole document instead of front-loaded. | Self-contained — nothing else in `ai/` calls into this except `provider.py`. |
| **`metadata_generation.py`** | The "Generate from existing tests" feature — writes new questions for a given topic/subtopic/questionType distribution, no source PDF involved (`generate_questions_from_metadata`). | Shares `_pack_groups_into_batches` and its system prompt with `duplicate_regeneration.py` — see `topic_batching.py`. |
| **`duplicate_regeneration.py`** | Rewrites questions flagged as near-duplicates (`regenerate_flagged_duplicates`), showing the model the existing question so the replacement is actually different. | Same shared dependency on `topic_batching.py` as above. |
| **`topic_batching.py`** | `_pack_groups_into_batches` (merges small topic/subtopic groups into one request instead of one request per group — this is what keeps a wide generation from burning through Gemini's free-tier daily request cap) and `METADATA_GENERATION_SYSTEM_PROMPT`, both shared by the two files above. | No dependencies of its own — pure data transformation, nothing here to break by editing the other two files. |
| **`question_matching.py`** | Dedup/matching helpers used while merging AI-extracted questions with the regex-extracted list during the main extraction pass: `_question_text_fingerprint`, `_is_same_extracted_question`, `_put_extracted_question`, `_missing_question_numbers`. | Used only by `provider.py`'s main orchestration loop. |
| **`diagram_crops.py`** | `_attach_diagram_crops` — crops each question's diagram bounding boxes out of the source page images and attaches them as assets. | Thin wrapper around `asset_extractor.crop_diagram`; the actual cropping math lives there, not here. |
| **`marking_scheme.py`** | Applies a mock test's per-section marking scheme (marks per correct answer, negative marking) to extracted/generated questions: `_build_section_ranges`, `_section_name_for_question_no`, `_apply_section_marks`, `_classify_question_type_label`, and the public `prepare_questions_for_persistence` (a thin wrapper — the very last step before questions are saved). | If you're changing how marks get assigned per section/template, this is the one file to touch. |
| **`template_generation.py`** | Exam-name → template-draft generation (`generate_template_from_exam_name`) — the AI side of the `/generate-template` endpoint (`http_server.py`, called from `backend/src/lib/template-generate-client.js`). | Genuinely unrelated to PDF question extraction — don't be surprised it doesn't touch anything else in `ai/`. |
| **`__init__.py`** | Re-exports `enhance_questions_with_ai`, `get_provider`, `generate_questions_from_metadata`, `regenerate_flagged_duplicates`, `generate_template_from_exam_name`, `prepare_questions_for_persistence` — this subpackage's public surface. | This is what `ai/__init__.py` itself imports from. |

## `ai/` top level and `ai/schema/`

| File | Responsible for | Constraints / gotchas |
|---|---|---|
| **`gemini_provider.py`** | `GeminiProvider` class — the actual HTTP calls to `generativelanguage.googleapis.com`, retry/backoff on 429s, daily-quota detection (`GeminiDailyQuotaExceededError`), and the rate-limit pacing shared across threads via `GEMINI_API_KEY`. | The model name comes from the `AI_MODEL` env var (falls back to `gemini-flash-latest`) — if extraction starts 404ing, check whether the configured model has been retired by Google before assuming it's a code bug. |
| **`openai_provider.py`** | `OpenAIProvider` — same interface as `GeminiProvider`, used when `AI_PROVIDER=openai`. Smaller because OpenAI's SDK handles more of the retry/schema plumbing itself. | Kept interface-compatible with `GeminiProvider` on purpose — both are used interchangeably by `get_provider()`. |
| **`schema/response_schemas.py`** | JSON schema builders for each AI response shape (question extraction, template generation, written-answer grading), in both Gemini's and OpenAI's slightly different schema dialects. Pure data — `_question_item_schema`, `_template_response_schema`, `_grading_response_schema` and the `GEMINI_*`/`OPENAI_*` constants built from them. | No parsing/normalization logic lives here on purpose — if you're changing what shape the model is *asked* for, this is the file; if you're changing how a response gets *cleaned up* after the fact, that's `question_normalization.py` instead. |
| **`schema/json_repair.py`** | Recovers a usable JSON payload from a raw AI response, including a truncated one: `extract_json_payload` (the entry point every provider response is funneled through) and its fallback `salvage_question_objects` for a response cut off mid-array. | Used across and outside `ai/` (every generation feature, plus `grading.py` and two `diagnose_*.py` scripts) — it's the most widely-imported file in this folder. |
| **`schema/question_normalization.py`** | `normalize_ai_questions` — the single choke point every AI-generated or AI-extracted question passes through regardless of which feature produced it (extraction, notes generation, metadata generation, duplicate regeneration): shape validation, field cleanup, diagram-marker sanitizing (`_rewrite_diagram_markers`, `_sanitize_slot_key`), and the small value parsers (`parse_positive_int`, `parse_nonnegative_int`, `parse_optional_number`, `clean_optional_text`) it depends on. | If a field is missing/malformed across the board regardless of which feature generated it, look here first. |
| **`schema/__init__.py`** | Re-exports `extract_json_payload`, `salvage_question_objects`, `normalize_ai_questions`, and the 6 `GEMINI_*`/`OPENAI_*` schema constants. | `gemini_provider.py`/`openai_provider.py` and everything in `ai/provider/` import from this, not from the specific submodule. |
| **`__init__.py`** | Re-exports the 6 functions anything outside `ai/` is allowed to call (see `ai/provider/__init__.py` above — this just re-exports what that one already re-exports). | Treat this list as the actual public API of the whole folder. Anything not re-exported (anything prefixed `_`, plus non-public constants) is internal. |

## `worker/` — job loop

`worker.py` was ~1,070 lines; `process_job` alone was ~570 of those. Three
pieces were split out (2026) — not because they were unrelated concerns
bolted together like `ai/provider.py` was, but because two of
`process_job`'s phases (PDF ingestion, and duplicate handling — the
latter was genuinely copy-pasted between `process_job` and
`process_generation_job`) had clean input/output boundaries with no
shared mutable state crossing them, so they could be lifted out safely.

| File | Responsible for | Constraints / gotchas |
|---|---|---|
| **`worker.py`** | `process_job` (still the main one — the "questions"/"notes"/"generate_from_existing" `documentType` branching, the AI-cleanup call, the streaming + batch-insert save logic) and `process_generation_job` (the "Generate from existing tests" job type), plus the process-level loop: `process_next_job`, `run_once`, `run_forever`, `main`. | The AI-cleanup + save portion of `process_job` (closures like `persist_vision_chunk`, `nonlocal` counters like `streamed_inserted`) was deliberately **not** split further — extracting a closure-heavy stateful phase into its own file needs an explicit context object to carry that state across the boundary, which is a bigger and riskier change than the three pieces below. Worth doing as its own careful pass if this function keeps growing. |
| **`job_helpers.py`** | Small independent helpers used across every job-processing function: `check_not_cancelled` (the cancellation check called at every stage boundary), `download_job_pdf`, `friendly_job_error_message` (sanitizes an exception into what the uploader actually sees), `_count_pages_with_text`, `PartialSaveFailed` + `_mark_partial_save_failure` (partial-save bookkeeping so a batch failure at question 1200/3000 doesn't get reported as "0 questions"), `_batched`. | Both `worker.py` and `job_pdf_intake.py` import from here — if you're adding a helper that more than one job-processing file will need, it goes here, not duplicated. |
| **`job_pdf_intake.py`** | `ingest_job_pdf(job)` — phase 1 of `process_job`: download from B2, extract page text, OCR any scanned pages, validate there's extractable content. Returns `(pages, pdf_path, temp_pdf_paths, ocr_summary)` with no other state to track — this clean a boundary is exactly why it split out safely. | If you're changing OCR behavior or PDF download logic, this is the file, not `worker.py`. |
| **`job_duplicate_handling.py`** | `report_diagram_upload_errors`, `run_duplicate_detection`, `run_duplicate_regeneration` — used by both `process_job` and `process_generation_job`. | `process_job` only calls detection, not regeneration; `process_generation_job` calls both. That asymmetry is existing, deliberate behavior carried over from before the split, not an oversight — don't "fix" it into symmetry without checking why first. |
| **`__init__.py`** | Re-exports `process_next_job` — the one thing `http_server.py` needs from this subpackage. | If something else outside `worker/` legitimately needs another function from here, add it to this re-export list rather than reaching into `worker.worker.worker` directly. |

## `http_server.py`

Lets the worker run as a Render Web Service instead of a Background
Worker (Background Workers have no free tier on Render). Exposes `/`
(health check) and `/generate-template` (synchronous template-draft
generation, calls `ai.generate_template_from_exam_name`) — actual job
processing still goes through `worker/worker.py`'s `run_once`, triggered
by an external pinger hitting this server periodically. Not split — it's
one cohesive thing, not several unrelated concerns.

## `db/` — Postgres access

All direct Postgres access for the worker — used to be one `db.py`
(793 lines), split (2026) by domain, the same way `ai/schema/` was.

| File | Responsible for | Constraints / gotchas |
|---|---|---|
| **`db_connection.py`** | `get_connection()` — the one connection factory everything else uses (`verify-full` TLS against `DB_CA_CERT_PATH`, matching what `src/db/pool.js` does on the Node side). | Nothing in the other three `db_*.py` files calls this — every function there takes an already-open `connection` as its first argument. Only external callers (`worker/worker.py`, `worker/job_*.py`, `grading.py`, `duplicate_detector.py`) open one. |
| **`db_jobs.py`** | `processing_jobs` lifecycle: `claim_next_job` (including reclaiming stale/orphaned jobs and failing ones that exceeded `MAX_JOB_RETRIES`), `is_job_cancelled`, `update_job`, `add_job_event`, and the `JobCancelled` exception. | `JobCancelled` is deliberately a `BaseException` subclass, not `Exception` — so it isn't silently swallowed by a bare `except Exception` elsewhere in the worker. Don't "clean up" its base class without checking why. |
| **`db_questions.py`** | Writing extracted/generated questions (`insert_question_batch` — including the per-question math-error check before anything is saved — `upsert_question_batch`, `replace_questions`), and the bookkeeping around a reprocess: `get_existing_question_numbers`/`flag_orphaned_question_slots` (which question numbers a reprocess run never touched), `count_questions_for_mock_test`, `mark_mock_test_after_processing`. | If a job needs a new piece of question-related state persisted, the query goes here. |
| **`db_duplicates.py`** | `question_duplicate_pairs` bookkeeping: `find_flagged_duplicate_slots` (feeds `ai/provider/duplicate_regeneration.py`), `replace_slot_content` (fork-if-shared — same safety check a human-driven edit uses), `delete_duplicate_pair`. | `replace_slot_content` never mutates a shared `question_contents` row in place — it forks a new row first. Don't "simplify" this without understanding why (see the function's own comment). |
| **`__init__.py`** | Re-exports every name any of the 6 external consumers needs — `get_connection`, `JobCancelled`, `claim_next_job`, `is_job_cancelled`, `update_job`, `add_job_event`, `count_questions_for_mock_test`, `flag_orphaned_question_slots`, `get_existing_question_numbers`, `mark_mock_test_after_processing`, `replace_questions`, `upsert_question_batch`, `find_flagged_duplicate_slots`, `replace_slot_content`, `delete_duplicate_pair`. | This is what makes `from .db import X` still read exactly like it did when `db.py` was one file. |

## `config.py`

All environment variables read anywhere in the worker, loaded once from
`.env` at import time. Grep this file before adding a new env var
elsewhere — chances are there's already a naming convention to match
(`AI_*` for AI-provider tuning, `*_SECONDS`/`*_MS` for timeouts, etc.).

## `pdf_extract.py`

Turns a PDF file into per-page text + classification (`extract_pdf_pages`,
`classify_page_content`) — answer-key detection, diagram-drawing
detection, code-block detection. This is the non-AI, deterministic first
pass every PDF goes through before anything gets sent to the AI provider.

## `question_parser.py`

The regex-based question parser — pulls question stems, options, and
answers out of already-extracted page text without any AI call
(`parse_questions` is the entry point). Its output is what
`ai/provider/question_matching.py` reconciles the AI's output against.

## `pdf_ocr.py`

Scanned-PDF handling: detects pages with no extractable text and runs them
through Tesseract to produce a searchable PDF (`is_tesseract_available`,
`convert_scanned_pdf_to_searchable_pdf`) before `pdf_extract.py` ever sees
them.

## `reconcile.py`

`reconcile_questions(regex_questions, ai_questions)` — merges the regex
parser's and the AI provider's output for one document into a single
question list, deciding per-question which source wins. Small and used by
exactly one caller (`ai/provider/provider.py`).

## `duplicate_detector.py`

Duplicate question detection across a workspace
(`detect_duplicates_for_mock_test` for one just-processed mock test,
`detect_duplicates_for_workspace` for a full pairwise scan). Backs the
Review Queue's duplicate-merge feature.

## `asset_extractor.py`

Converts a model-reported diagram bounding box into pixel coordinates
against the exact page image the vision model was shown, then crops it
(`crop_diagram`). The only thing `ai/provider/diagram_crops.py` calls.

## `storage.py` / `cloudinary_storage.py`

File storage for the worker's two asset types: `storage.py` for PDFs on
Backblaze B2, `cloudinary_storage.py` for diagram images on Cloudinary
(deliberately mirrors `backend/src/lib/cloudinary-storage.js`'s
`public_id` convention — keep the two in sync if either changes).

## `placeholders.py`

`is_placeholder_question` — detects invented filler questions (answer-key
hallucinations, e.g. a model inventing "Question 21" text for a page that
was actually just an answer key). Kept as its own module specifically so
the regex parser, the AI normalizer, and the reconciler can all call the
same check without importing each other.

## `grading.py`

Asynchronous rubric grading for submitted written answers (short/long
answer and numerical questions the MCQ auto-grader can't score). Batches
up to 12 answers per database round-trip per the module docstring.

## Diagnostic / one-off scripts

`diagnose_connection.py`, `diagnose_page_classification.py`,
`diagnose_page_matching.py`, `diagnose_real_vision_response.py`,
`diagnose_vision_request.py` — standalone scripts for manually
investigating a specific failure mode (run directly, not imported by
anything). `*_selftest.py` files (`extraction_selftest.py`,
`notes_question_count_selftest.py`, `math_validator.selftest.py`) are
lightweight regression checks for one feature each, also run directly
rather than through a test framework.
