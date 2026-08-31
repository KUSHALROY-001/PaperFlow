# DEBUG_LOG.md — PaperFlow Debugging History

**Purpose:** Append-only historical record of meaningful debugging investigations  
**Related:** `AI_INSTRUCTIONS.md`, `CURRENT_STATE.md`, `IMPLEMENTATION_LOG.md`, `KNOWN_ISSUES.md`, `DECISION_LOG.md`, `CHANGE_INDEX.md`

---

## Mini-Manual: How Future AI Agents Should Use This File

### 1. What This File Is

This file is an **append-only historical record** of meaningful debugging investigations.

It preserves **successful and unsuccessful** attempts: symptoms, hypotheses, investigation steps, failed approaches, working approaches, evidence, confirmed or unconfirmed root causes, verification scope, and warnings for the next agent.

It is **not** the live issue tracker. Active/recurring status summaries belong in `KNOWN_ISSUES.md`. Present architecture belongs in `CURRENT_STATE.md`.

### 2. When AI Should Read It

Search this file **before**:

- Debugging an existing or production problem  
- Changing code because of an error or regression  
- Investigating worker / API / database / auth / storage / deployment failures  
- Changing configuration due to a suspected issue  
- Investigating a problem that may have occurred before  

### 3. How AI Should Search It

**Do not read the entire file by default.**

Search by:

- Exact error message or distinctive log line (e.g. `got 502`, `Missing image`, `relation "questions"`)  
- Error code / HTTP status  
- Symptom  
- Feature or subsystem  
- File path / function / API endpoint / service  
- Database table or view  
- Environment (`Production`, `Worker`, `Local`)  
- `BUG-XXX`, related `IMP-XXX`, related `DEC-XXX`  

Read only matching entries and their cross-references.

### 4. How AI Should Write to It

Every meaningful investigation gets a unique **`BUG-XXX`**.

- Append new entries (or clearly labeled follow-ups on the same BUG).  
- **Never** rewrite an old investigation because a later agent found a better explanation—add a correction / follow-up instead.  
- Record **failed** attempts with reason, result, and evidence.  
- Separate **hypothesis** from **root cause**, and **fix** from **verification**.  
- Use `Unknown` / `Not verified` when evidence is missing.  
- Never store secrets; redact with `[REDACTED]`.

### 5. What Counts as a Meaningful Debugging Entry

Record investigations involving non-trivial:

- Application, production, worker, API, database failures  
- Auth / OAuth / storage / deployment / configuration / integration failures  
- Regressions and recurring bugs  
- Difficult or non-obvious bugs  

Skip trivial typos unless the path has lasting diagnostic value.

### 6. Recurring Bugs

Search for an existing BUG first. If the same underlying issue returns, document recurrence and link to the original ID. If symptoms match but root cause differs, open a new BUG and state the distinction.

### 7. Accuracy Rule

Never invent timestamps, agents, commits, log lines, or production verification. Prefer incomplete accurate records over plausible fiction.

---

# END OF FILE MANUAL

Everything below this line is historical debugging data.  
Do not rewrite historical investigations.  
New debugging information must be appended as a new entry or as a clearly documented follow-up.

---

## BUG-001 — Stale Diagram After Replace/Crop (CDN / Browser Cache)

**Timestamp:** 2026-08-27 (date from `CURRENT_STATE.md`; time Unknown)  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Resolved (per `CURRENT_STATE.md` historical warning)  
**Environment:** Production + Browser (as documented); Local: Unknown  
**Subsystem:** Diagram delivery, Cloudinary, question editor  
**Severity:** High (editor showed wrong figure after explicit user edit)

### Problem / Symptom

After replacing or cropping a diagram, the editor continued to show the previous image.

### Expected Behavior

After save, the UI should show the new diagram bytes immediately.

### Initial Hypothesis

Unknown historical hypotheses. Documented cause in `CURRENT_STATE.md`: browser + Cloudinary CDN caching stable URLs under long `Cache-Control`.

### Investigation

Documented conclusion: stable public IDs + cache headers prevented immediate visibility of new uploads.

### Attempts

#### Attempt 1 — Cache versioning + invalidation + img remount

**Approach:** Version diagram URLs with `?v=<created_at_ms>`; Cloudinary `overwrite` + `invalidate`; frontend remount `<img>` when URL changes.

**Reason:** Force cache miss without abandoning stable public ID scheme.

**Result:** Documented as fixed 2026-08-27.

**Evidence:** `CURRENT_STATE.md` Warning 1; `DEC-004`; `IMP-006`.

**Status:** SUCCESSFUL (per project state doc; independent re-test in this logging pass: Not verified)

### Root Cause

Cached diagram URLs (browser + CDN) after replace/crop when URL identity did not change in a cache-busting way.

### Resolution

URL versioning tied to asset `created_at`, Cloudinary invalidation, frontend remount on URL change.

### Verification

- Local: Unknown in this pass  
- Production: Claimed fixed in `CURRENT_STATE.md` (Not re-verified here)  
- Browser: Part of documented fix  

### Result

Stale-diagram class of bugs treated as resolved when versioning stack remains intact.

### Regression Risk

Removing `v=`, `invalidate`, or img remount reintroduces the symptom.

### Related Records

- IMP-006  
- DEC-004  
- CURRENT_STATE Warning 1  

### Future AI Instructions

Do not “simplify” diagram URLs by stripping version query params. Coordinate frontend, API, and Cloudinary.

### Follow-up

None recorded.

---

## BUG-002 — Worker Database Connection Failures (Historical)

**Timestamp:** Unknown  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Resolved (per `CURRENT_STATE.md` Warning 2); no active incidents recorded as of 2026-08-31 state doc  
**Environment:** Worker / Deployment (historical)  
**Subsystem:** Worker ↔ PostgreSQL  
**Severity:** High when active  

### Problem / Symptom

Worker could not connect to the database in certain deployments (details of exact error string: Unknown).

### Expected Behavior

Worker claims jobs and reads/writes Postgres successfully with the same logical database as the API.

### Initial Hypothesis

Configuration / connection pool issues (as summarized in `CURRENT_STATE.md`).

### Investigation

Historical; specific log excerpts not available in this reconstruction.

### Attempts

#### Attempt 1 — Configuration and pool management changes

**Approach:** Adjust worker DB configuration and pool handling (exact diff: Unknown).

**Reason:** Connection failures attributed to config/pool.

**Result:** Documented as resolved; “configuration stable.”

**Evidence:** `CURRENT_STATE.md` Warning 2 only.

**Status:** SUCCESSFUL (per state doc; Not re-verified here)

### Root Cause

Not fully documented in available materials beyond “configuration and connection pool management.”

### Resolution

Configuration/pool fixes (exact files: Unknown).

### Verification

- Production worker: Documented as no active incidents as of 2026-08-31 state snapshot  
- Independent verification this pass: Not verified  

### Result

Treated as historical closed issue unless recurrence appears.

### Regression Risk

Wrong `DATABASE_URL`, TLS CA, or pool settings on worker service only.

### Related Records

- DEC-006  
- CURRENT_STATE Warning 2  

### Future AI Instructions

On worker DB errors, compare API vs worker env (host, SSL, pool) before rewriting claim logic.

### Follow-up

If recurrence occurs, open `BUG-002` follow-up or new recurrence ID with exact exception text.

---

## BUG-003 — JEE Advanced Extraction: Question Count OK, Mathematics Overwritten by Chemistry

**Timestamp:** Partially Known (~2026-08-29 debugging session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Partially Resolved (merge/fingerprint fix implemented; full production reprocess proof: Not verified)  
**Environment:** Worker extraction (user-reported job output); Local PDF sample used for diagnosis  
**Subsystem:** Worker AI merge / reconcile, templates  
**Severity:** High (wrong subject content shipped as “successful” extraction)

### Problem / Symptom

Using JEE Advanced template on Paper 1 English PDF:

- Extraction reported on the order of **51** questions (plausible count).  
- **Mathematics content missing**; chemistry-like topics/content reused under numbers that should have been math.  
- Not a hard crash; `processing_jobs` summary did not surface this as a pipeline exception.

### Expected Behavior

Physics, Chemistry, and Mathematics sections retained as distinct questions even when `question_no` restarts per subject.

### Initial Hypothesis

Template JSON wrong or AI simply “forgot” math.

### Investigation

- Template listed Physics / Chemistry / Mathematics.  
- Sample extracted items (user-provided) were chemistry-themed across early numbers.  
- Merge path in AI provider keyed collisions primarily by `question_no`, so subject restarts clobbered earlier entries.  
- `output_summary` style metrics could still look healthy (merged count) while identity was wrong.

### Attempts

#### Attempt 1 — Blame template settings only

**Approach:** Inspect template `settings` / subject specification JSON.

**Reason:** User pointed at template and subject specification.

**Result:** Template included all three subjects; not sufficient alone as the overwrite mechanism.

**Evidence:** Template JSON contained mathematics section definitions; subjects array included Mathematics.

**Status:** FAILED (as sole root cause)

**Conclusion:** Template issues can worsen labeling, but collision on `question_no` explained overwrite of distinct bodies.

#### Attempt 2 — Fingerprint / safer put into merge map

**Approach:** Change `_put_extracted_question` (and related merge behavior) so distinct bodies/subject restarts are not silently replaced by later same `question_no`.

**Reason:** Merge map identity was too weak for multi-subject papers.

**Result:** Fix implemented in worker AI provider path (`IMP-008`).

**Evidence:** Code change in session artifacts; user-driven diagnosis from summary + samples.

**Status:** SUCCESSFUL (as engineering fix); production re-extraction confirmation: Not verified

### Root Cause

In-memory merge/dedup keyed in a way that **subject-restarted question numbers collided**, dropping or replacing earlier subjects’ questions while total count remained believable.

### Resolution

Stronger merge identity / fingerprint handling in AI enhance merge (`IMP-008`).

### Verification

- Local full paper reprocess: Not verified in this log pass  
- Production: Not verified  
- Diagnostic evidence: User samples + code inspection  

### Result

Class of collision bugs addressed in code; still requires correct templates and vision/text quality.

### Regression Risk

Any new merge path that keys only on `question_no` reintroduces the bug.

### Related Records

- IMP-008  
- IMP-002  

### Future AI Instructions

When counts look right but subjects are wrong, inspect **merge keys** before re-tuning prompts alone.

### Follow-up

Record a new BUG if a specific paper still loses a subject after fingerprint fix, with `output_summary` + samples attached.

---

## BUG-004 — “Missing image” in UI While Assets Exist in Cloudinary

**Timestamp:** Partially Known (~2026-08-29 session; multiple iterations)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Resolved (user confirmed UI worked after final plumbing fix)  
**Environment:** Browser UI + API question payload; Cloudinary objects present (user-checked)  
**Subsystem:** Question mappers, Output/review rendering, `DiagramAssetsProvider`  
**Severity:** High (false data-loss signal)

### Problem / Symptom

Question/option diagrams showed **Missing image** placeholders. User verified corresponding images existed in Cloudinary. UI did not update across several deploy attempts until mapper/provider fixes landed.

### Expected Behavior

Markers `![[img:slot_key]]` resolve to signed/available asset URLs from `diagramAssets`.

### Initial Hypothesis

1. Cloudinary upload failed.  
2. `question_assets` rows missing.  
3. Crop/extraction failed.  
4. (Later) Frontend not receiving or not providing assets to renderers.

### Investigation

Traced pipeline: extraction → DB assets → API → `toEditorQuestion` / list mappers → Output tab / cards → MathText/ImageNode. Failure mode consistent with **assets dropped or context missing on the frontend**, not empty Cloudinary.

### Attempts

#### Attempt 1 — Suspect question asset controller / config only

**Approach:** Focus on asset controller and `config.py` as user suggested.

**Reason:** User believed those files were at fault.

**Result:** Insufficient alone; symptom persisted (“still same”, “no update on the UI”) until broader plumbing fixed.

**Evidence:** Repeated user reports after partial changes.

**Status:** FAILED / INCONCLUSIVE as sole fix

#### Attempt 2 — Pass `diagramAssets` through mappers

**Approach:** Ensure `toEditorQuestion` / `mapQuestion` (and related serialize paths) retain `diagramAssets`.

**Reason:** Provider cannot resolve markers without asset list on the question object.

**Result:** Necessary but early deploys still reported missing UI until provider wiring completed.

**Evidence:** Code path review; partial progress.

**Status:** PARTIALLY WORKED

#### Attempt 3 — Wrap Output/review surfaces with `DiagramAssetsProvider`

**Approach:** Provide diagram context where Output tab / bank cards render markers.

**Reason:** Stem/editor paths had context; Output path did not.

**Result:** User confirmed **“Okay, it actually works.”**

**Evidence:** Explicit user confirmation after this class of fix.

**Status:** SUCCESSFUL

### Root Cause

Frontend resolution path incomplete: **diagram asset metadata not consistently available in the render tree** (mapper drop and/or missing provider), despite storage success.

### Resolution

Mapper pass-through + `DiagramAssetsProvider` on affected surfaces (`IMP-009`).

### Verification

- Browser (user): VERIFIED (confirmation message)  
- Production deploy of that build: Assumed by user testing path; formal matrix: Not verified  
- Local: Unknown  

### Result

Missing-image false negative resolved for the reported Output/UI path.

### Regression Risk

New preview components that skip provider or strip `diagramAssets` will regress.

### Related Records

- IMP-005, IMP-009  
- IMP-006 (separate cache issue; do not conflate)

### Future AI Instructions

Do not jump to re-extraction or Cloudinary re-upload when Cloudinary already has objects—trace API JSON → mapper → provider first.

### Follow-up

None required unless a specific surface still omits provider.

---

## BUG-005 — Option Diagrams Clipped by Tight Bounding-Box Crop

**Timestamp:** Partially Known (~2026-08-29 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Resolved (mitigation shipped)  
**Environment:** Worker extraction output  
**Subsystem:** `asset_extractor` crop geometry  
**Severity:** Medium  

### Problem / Symptom

Extracted **option** diagrams appeared cut off. User attributed tight model `x,y` boxes used directly as crop rects.

### Expected Behavior

Cropped assets include the full diagram (or enough margin for manual tighten).

### Initial Hypothesis

Model box ≈ true diagram bounds; crop should expand.

### Investigation

Aligned with crop implementation using detection coordinates with insufficient padding.

### Attempts

#### Attempt 1 — Expand padding to ~2× dimensions

**Approach:** Increase padding (e.g. ~50% per side) in `crop_diagram` / asset extractor.

**Reason:** User requested “2x,2y” coverage so imperfect detection still captures figure; editor crop can tighten.

**Result:** Implemented (`IMP-011`).

**Evidence:** Code change; quantitative before/after on user PDFs: Not verified in log pass.

**Status:** SUCCESSFUL (as requested mitigation)

### Root Cause

Crops followed detection boxes too tightly for option figures.

### Resolution

Larger default padding during extraction; manual crop remains available (`IMP-010`).

### Verification

- Worker output: Not independently remeasured here  
- Product intent: Matched user request  

### Result

Fewer edge-clipped option images expected; over-inclusion possible.

### Regression Risk

Reducing padding without page-fetch fallback increases clipping again.

### Related Records

- IMP-011, IMP-010, IMP-016  

### Future AI Instructions

Prefer padding + user crop over trusting raw model boxes for small option art.

### Follow-up

Optional: per-placement padding (option vs stem).

---

## BUG-006 — Processing Jobs Remain Queued Until Manual Worker Curl

**Timestamp:** Partially Known (~2026-08-30 production debugging)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Partially Resolved (kick path and retries verified in API logs; persistent worker 502 still blocks completion when worker unhealthy)  
**Environment:** Production API + Production Worker (Render); Local: separate behavior when URL unset  
**Subsystem:** `kickWorker`, `worker/http_server.py`, job queue  
**Severity:** Critical (uploads never process without manual intervention when kick fails)

### Problem / Symptom

- Multiple accounts upload → jobs stay **queued**.  
- Running worker from terminal (local) or **manual `POST /run`** starts processing.  
- User expected upload alone to start work without cron.  
- Cron-job.org reported **invalid URL** / **too large output** during parallel confusion.  
- API logs eventually showed:
  - `Kicking deployed worker for job … at https://paperflow-worker.onrender.com/run`
  - `Kick for job … got 502 … [HTML error page truncated]` on attempts 1–6  

### Expected Behavior

After `processing_jobs` insert, API kick wakes worker; job moves to `running` without manual curl when worker can boot.

### Initial Hypothesis

Several successive hypotheses:

1. `kickWorker` not called from `queueProcessingJob`.  
2. Concurrency lock in `http_server` serializes kicks so job 2 waits for job 1.  
3. Cron required and misconfigured.  
4. API missing `WORKER_SERVICE_URL` / secret → silent no-op or bad local spawn.  
5. Worker cold start / unhealthy service returns 502 HTML.

### Investigation

- Code: `queueProcessingJob` does call `kickWorker` after commit.  
- Manual curl to worker `/run` returned **HTTP 202** `{"status":"started"}` when worker healthy.  
- Worker logs on curl: `Running 'python -m worker.http_server'` (cold start).  
- API logs on upload: kick **fires**, response **502** HTML (Render gateway page)—explains cron “too large output” if cron hit 502 HTML.  
- PowerShell `curl` alias issues caused some “invalid URL” noise on the client side (user environment).

### Attempts

#### Attempt 1 — Assume concurrency single-lock bug only

**Approach:** Analyze/replace global lock with semaphore slots in `http_server` (`WORKER_CONCURRENCY`).

**Reason:** Multi-user upload while one long job runs should still start other jobs.

**Result:** Valid concurrency improvement when worker is up; **does not explain** 502 before any handler runs.

**Evidence:** Later production logs show failure at gateway 502, not app-level 202 queued.

**Status:** PARTIALLY WORKED (concurrency) / FAILED (as sole explanation of queued-until-curl)

#### Attempt 2 — Local-dev spawn when URL unset

**Approach:** `kickWorker` spawns `python -m worker.worker --once` if deployed URL not configured.

**Reason:** Local upload without second terminal.

**Result:** Helps local; on Render without env, spawn is useless.

**Evidence:** Design of `worker-runner.js`.

**Status:** PARTIALLY WORKED (local only)

#### Attempt 3 — Production guard if env missing on API

**Approach:** On Render/production, log hard error instead of local spawn when URL/secret missing.

**Reason:** Silent wrong fallback.

**Result:** Improves diagnosability; user’s later logs show URL **was** set (kick reached worker hostname).

**Evidence:** Log line with full worker `/run` URL.

**Status:** SUCCESSFUL as hardening; not the final production failure mode

#### Attempt 4 — Retry kicks on 502/503/504 + truncate HTML logs

**Approach:** Multiple attempts with delay; do not log full Render HTML body.

**Reason:** Cold start may accept a later attempt; 502 HTML flooded logs and broke cron size limits.

**Result:** API logs show retries 1–6 with truncated body—**retry code works**. All attempts still 502 when worker never becomes healthy within window.

**Evidence:** Production API log excerpt provided by user.

**Status:** PARTIALLY WORKED (cold start) / FAILED when worker stays down

#### Attempt 5 — Manual curl / rely on cron

**Approach:** Operator wakes worker via curl.

**Reason:** Confirms worker binary and secret work.

**Result:** Processing starts when instance is live.

**Evidence:** 202 responses; user observation.

**Status:** SUCCESSFUL as workaround, not product fix

### Root Cause

**Multi-factor:**

1. **Confirmed:** Upload path **does** attempt kick when env configured.  
2. **Confirmed:** Failure mode in reported prod logs is **HTTP 502 from Render in front of worker**, not missing `kickWorker` call.  
3. **Confirmed:** 502 body is large HTML (cron “too large output” when probing unhealthy worker).  
4. **Partially confirmed:** Free-tier **cold start** contributes (worker log shows process start on demand).  
5. **Not conclusively confirmed for all-6-fail cases:** Whether worker crash-on-boot, suspended service, wrong start command, or cold start longer than retry budget—requires worker **runtime** logs at failure time.

### Resolution

- Engineering: kick retries + log truncation + production env guard (`IMP-014`, `IMP-015`).  
- Operational: Worker service must stay startable (`python -m worker.http_server`), same secret, valid `DATABASE_URL`, not suspended.

### Verification

| Check | Result |
| ----- | ------ |
| API calls `kickWorker` | VERIFIED (production logs) |
| Worker `/run` when healthy | VERIFIED (curl 202) |
| Retries on 502 | VERIFIED (attempts 1–6 logged) |
| Upload completes without curl when worker was asleep but healthy | Not verified in provided logs (all attempts 502) |
| Worker runtime healthy across full retry window | NOT VERIFIED / appears FAILED in provided incident |

### Result

**Kick wiring is not the mystery anymore.** Remaining blocker is **worker availability** during kick window. Issue is **Partially Resolved** in software; **Unresolved** as an ops/reliability problem when 502 persists.

### Regression Risk

- Treating 502-only incidents as “kick not implemented” wastes time.  
- Removing retries re-exposes short cold starts.  
- Cron against 502 HTML will keep failing size checks.

### Related Records

- IMP-014, IMP-015  
- DEC-006  
- BUG-007 (cron noise related)

### Future AI Instructions

1. Read API logs for `[worker-runner]` first.  
2. If 502 HTML → debug **worker service**, not mock-test upload SQL.  
3. Do not mark production fixed until an upload succeeds **without** manual curl after worker idle.

### Follow-up

Capture worker runtime logs during a full 6-attempt 502 sequence; confirm start command and free-tier suspension.

---

## BUG-007 — Cron / Client “Invalid URL” and “Too Large Output” Against Worker

**Timestamp:** Partially Known (~2026-08-30; concurrent with BUG-006)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Explained / Partially Resolved (understanding); cron optional per product preference  
**Environment:** cron-job.org + operator terminal (PowerShell) + Worker URL  
**Subsystem:** External pinger, worker HTTP  
**Severity:** Medium (ops confusion; not core app logic)

### Problem / Symptom

- cron-job.org: invalid URL and/or too large output.  
- Terminal curl attempts sometimes “invalid URL”.  
- Direct correct `curl.exe` to worker `/run` later returned proper small JSON 202.

### Expected Behavior

Pinger receives small JSON (`{"status":"started"}` or health `{"status":"ok"}`).

### Initial Hypothesis

Worker returning huge payloads; or URL mis-entered; or PowerShell `curl` alias breaking query strings.

### Investigation

- Healthy `/run` response is tiny JSON.  
- Unhealthy edge returns **Render 502 HTML** (very large)—matches “too large output”.  
- PowerShell `curl` is often `Invoke-WebRequest` (different parsing).

### Attempts

#### Attempt 1 — Blame application returning large body on /run

**Approach:** Inspect `http_server` success path.

**Reason:** Cron size errors.

**Result:** Success path is small JSON; large body is gateway error HTML.

**Evidence:** Code + curl 202 body; API logs truncating HTML on 502.

**Status:** FAILED (as app bug)

#### Attempt 2 — Use curl.exe and exact URL with https + token

**Approach:** Operator uses real curl and full URL.

**Reason:** Alias/URL shape issues.

**Result:** 202 when worker up.

**Evidence:** User-pasted HTTP/1.1 202 response.

**Status:** SUCCESSFUL (client-side)

### Root Cause

- **Large output:** 502 HTML from platform when worker not ready—not application JSON bloat.  
- **Invalid URL:** Client/config URL mistakes and/or PowerShell curl alias—not proven as server bug.

### Resolution

Educate ops; prefer API kick + retries; optional cron only against healthy worker; use `curl.exe` on Windows.

### Verification

curl 202 VERIFIED when healthy; cron not required for product direction.

### Result

Confusion resolved analytically; cron remains optional backstop.

### Regression Risk

Pointing cron at API instead of worker, or at `/` expecting job run.

### Related Records

- BUG-006  
- IMP-014, IMP-015  

### Future AI Instructions

Never assume `/run` returns large bodies on success. Check for 502 HTML first.

### Follow-up

None.

---

## BUG-008 — Image-Only PDF Extracts Zero Questions

**Timestamp:** Partially Known (~2026-08-30 diagnosis session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Root cause explained; environment-dependent resolution  
**Environment:** Worker extraction; sample medical/anatomy PDF (4 pages, image-only)  
**Subsystem:** PDF text layer, OCR, vision AI  
**Severity:** High for scanned papers  

### Problem / Symptom

PDF visibly full of MCQs; modes “already has questions” and “notes/quiz generation” both yielded **zero** questions.

### Expected Behavior

Scanned papers still extract via OCR and/or vision when enabled.

### Initial Hypothesis

Parser broken or wrong documentType mode.

### Investigation

PyMuPDF `get_text` on all pages: **0 characters**; one full-page raster image per page. Regex parser cannot see questions. Notes mode also needs text or working generation path. Success requires `OCR_ENABLED` + Tesseract and/or AI vision with keys on **worker**.

### Attempts

#### Attempt 1 — Treat as application “extraction always broken”

**Approach:** Would be broad parser rewrite.

**Reason:** Zero questions.

**Result:** Not indicated—digital text PDFs and other pipelines work per project state.

**Evidence:** Empty text layer measurement on the specific file.

**Status:** FAILED (as general parser bug)

#### Attempt 2 — Diagnose scan + OCR/AI dependency

**Approach:** Document that image-only PDFs need OCR/vision; check job `output_summary` for `pagesWithText`, OCR, AI enabled flags.

**Reason:** Pipeline design in `pdf_extract` / worker.

**Result:** Correct diagnosis for this file class.

**Evidence:** Page text length 0; code paths for OCR and vision.

**Status:** SUCCESSFUL (diagnosis)

### Root Cause

**No selectable text layer** on the PDF; without OCR and/or vision AI configured on the worker, extraction yields zero questions by design—not a silent random UI bug.

### Resolution

Operational: enable OCR and/or AI on worker; product: optional clearer empty-state messaging (not verified shipped).

### Verification

- PDF text layer empty: VERIFIED in analysis environment  
- Production worker OCR/AI flags for that job: Unknown (user did not paste summary)

### Result

Understood failure mode for pure scans.

### Regression Risk

Deploying worker without Tesseract/AI and expecting scans to work.

### Related Records

- DEC-006  
- IMP-016 (manual page fetch helps diagrams, not full auto extract)

### Future AI Instructions

On zero questions, first measure text-layer page counts before rewriting the question parser.

### Follow-up

Improve user-facing job summary when `pagesWithText == 0` and OCR/AI disabled.

---

## BUG-009 — Horizontal Worker Scaling vs Per-Process AI Rate Limit (Risk / Design Bug Class)

**Timestamp:** Documented risk as of 2026-08-31 `CURRENT_STATE.md`  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Unresolved (architectural risk; not a single incident ticket)  
**Environment:** Worker deployment scaling  
**Subsystem:** `gemini_provider` rate limiter  
**Severity:** Medium–High if multiple worker processes share one API key  

### Problem / Symptom

Module-level rate limiter is **per process**. Multiple worker processes can exceed provider quota even when each process thinks it is compliant.

### Expected Behavior

Global quota respected across replicas (or explicit ops guidance not to scale out without shared limiter).

### Initial Hypothesis

N/A — design limitation recorded in state doc.

### Investigation

`CURRENT_STATE.md` Zone 8 / worker rate limiting notes.

### Attempts

None recorded as a completed shared-limiter implementation in available history.

### Root Cause

Rate limit state not shared across processes (by current design).

### Resolution

Not implemented in reviewed history. Mitigation: single worker process or external shared limiter (Redis, etc.) if scaling out.

### Verification

Not verified as an incident; recorded as risk.

### Result

Open design risk.

### Regression Risk

Increasing replica count without shared limiter.

### Related Records

- DEC-006  
- CURRENT_STATE Zone 8  

### Future AI Instructions

Do not raise `WORKER_CONCURRENCY` / replica count without revisiting quota strategy.

### Follow-up

If quota 429 storms appear with multiple processes, link new incident BUG to this entry.

---

# Appendix — Search Hints

| Symptom / log fragment | Start here |
| ---------------------- | ---------- |
| Stale diagram after crop | BUG-001 |
| Worker DB connection | BUG-002 |
| Wrong subject / math missing / collision | BUG-003 |
| Missing image + Cloudinary has file | BUG-004 |
| Clipped option diagram | BUG-005 |
| Job stuck queued; need curl | BUG-006 |
| Cron too large / invalid URL | BUG-007 |
| Zero questions on scan PDF | BUG-008 |
| Provider 429 with many workers | BUG-009 |
| `[worker-runner] … 502` | BUG-006 |
| `Running 'python -m worker.http_server'` on first hit | BUG-006 (cold start) |

Next new debugging entry: **BUG-010** (scan for max ID first if concurrent agents append).

---

**End of DEBUG_LOG.md**
