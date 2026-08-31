# IMPLEMENTATION_LOG.md — PaperFlow Implementation History

**Purpose:** Append-only historical record of meaningful implementations  
**Related system docs:** `AI_INSTRUCTIONS.md`, `CURRENT_STATE.md`, `DEBUG_LOG.md`, `DECISION_LOG.md`, `KNOWN_ISSUES.md`, `CHANGE_INDEX.md`

---

## Mini-Manual: How Future AI Agents Should Use This File

### 1. What This File Is

This file is an **append-only historical record** of meaningful implementation changes in PaperFlow.

It preserves *what was built, why, how, which files were involved, what was verified, what broke later, and what another AI must know before changing that area*.

It is **not** a description of the present system. For “what is true right now,” read `CURRENT_STATE.md` and the current source code.

### 2. When AI Should Read It

Search this file **before** modifying an existing:

- Feature or product flow  
- Module, component, or shared utility  
- API route / controller / service / repository  
- Database table, view, or migration-related behavior  
- Auth / OAuth  
- Storage (Cloudinary, B2/S3)  
- Worker, job queue, or background processing  
- Deployment / worker kick / env-driven integrations  
- Configuration that other subsystems depend on  

Do **not** start large refactors in those areas using only intuition from the current file tree.

### 3. How AI Should Search It

**Do not read the entire file by default.**

Search by relevant terms:

- Feature name (e.g. “diagram”, “avatar”, “kickWorker”, “pdf-page”)  
- Module / component name  
- File path (`worker-runner.js`, `http_server.py`, `question_assets`)  
- Function name  
- API endpoint (`/run`, `/render-page`, `/pdf-page`)  
- Service or repository name  
- Database table / view (`question_slots`, `question_contents`, `questions`)  
- Configuration key (`WORKER_SERVICE_URL`, `WORKER_RENDER_CONCURRENCY`)  
- IDs: `IMP-XXX`, related `BUG-XXX`, related `DEC-XXX`  

Read only matching entries (and closely related cross-references).

### 4. How AI Should Write to It

After a meaningful implementation:

1. Append a **new** entry with the next free `IMP-XXX` ID.  
2. Fill fields you can verify; use `Unknown` for the rest.  
3. Cross-link related `BUG` / `DEC` / prior `IMP` IDs.  
4. Update `CURRENT_STATE.md` and `CHANGE_INDEX.md` when appropriate.  

**Never** edit an old entry to “make it match” a later design, except to fix an obvious logging-format error.

### 5. What Counts as a Meaningful Implementation

Record entries for:

- New features  
- Major bug fixes  
- Architecture changes  
- API contract changes  
- Database / migration changes  
- Authentication / OAuth  
- Storage integrations  
- Workers / background jobs  
- Deployment trigger paths  
- External integrations (AI providers, Cloudinary, B2)  
- Important configuration  
- Significant UI/UX behavior  
- Changes that can break another subsystem  

Skip pure formatting, comment-only, or trivial renames unless they encode a real behavioral decision.

### 6. Historical Rule

> **This file is append-only. Never rewrite history.**

If an implementation is later replaced:

```text
IMP-001 → Original implementation
IMP-007 → Replacement implementation
```

Keep **both**. Status of the old entry may become `Superseded`.

### 7. Accuracy Rule

Never invent:

- Timestamps  
- AI/agent identity  
- Branch names  
- Commit hashes  
- File lists you did not inspect  
- Test results you did not run  
- Production verification claims  

Use:

```text
Unknown
```

when information cannot be verified from code, migrations, docs, or trustworthy session evidence.

Mark partially reconstructed history as **Partially Known**.

---

# END OF FILE MANUAL

Everything below this line is implementation history.  
Do not modify historical entries unless correcting an obvious logging-format error.  
New information must be appended as a new entry.

---

## IMP-001 — Initial PostgreSQL Schema and Core Domain Model

**Timestamp:** Unknown  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Database (migration `001_initial_schema.sql` present in repo)  
**Subsystem:** Database, core domain  

### Problem / Motivation

Need durable multi-tenant storage for users, workspaces, clusters, mock tests, uploads, processing jobs, and questions.

### Implementation

Introduced baseline schema including users, workspaces, membership, clusters, mock tests, uploaded files, processing jobs/events, and an original physical `questions` table (later evolved).

### Approach

Numbered SQL migrations applied via backend migrate runner; parameterized SQL access from repositories.

### Why This Approach

Explicit schema control without an ORM; matches four-layer backend (`DEC-001` in `CURRENT_STATE.md`).

### Files Changed

- `backend/migrations/001_initial_schema.sql`  
- Related early repository/service modules (exact set: Unknown)  

### Dependencies / Assumptions

PostgreSQL 16; extensions such as pgcrypto / citext as used by later schema.

### Alternatives Considered

Unknown.

### Verification

Unknown (schema exists in repository; production application not re-verified in this logging pass).

### Result

Core domain persisted; later migrations evolved question storage and assets.

### Regression Risk

Changing early tables without additive migrations can break the entire app.

### Related Records

- DEC-001 (4-layer architecture; documented in `CURRENT_STATE.md`)  
- DEC-007 (workspace isolation)  
- IMP-004 (question content split)  

### Future AI Notes

Do not edit applied migration files in place. Add new numbered migrations only.

---

## IMP-002 — Extraction Templates Subsystem

**Timestamp:** Unknown  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Database + API (migrations `002_*`, `004_*`, `010_*`, `036_*`, `037_*` present)  
**Subsystem:** Extraction templates, mock-test creation  

### Problem / Motivation

Exam formats (e.g. section layouts, marking) vary; users need reusable templates when creating/processing papers.

### Implementation

Template tables, applications, ratings; settings JSON used during processing as `templateContext`.

### Approach

JSONB `settings` for flexible exam structure; workspace-scoped templates; optional apply-on-mock-test flow.

### Why This Approach

Avoid hard-coding every board/exam layout in application code.

### Files Changed

- `backend/migrations/002_extraction_templates.sql`  
- `backend/migrations/004_extraction_templates_hardening.sql`  
- `backend/migrations/010_extraction_templates_syllabus.sql`  
- `backend/migrations/036_extraction_template_ratings.sql`  
- `backend/migrations/037_remove_template_is_popular.sql`  
- Template services/routes (exact paths: Partially Known)  

### Dependencies / Assumptions

Worker and AI prompts can consume `templateContext` from `processing_jobs.input_config`.

### Alternatives Considered

Unknown.

### Verification

Unknown beyond presence of migrations and references in worker/provider code paths.

### Result

Template-driven extraction available; incorrect template settings can mis-align subjects/sections (see session issues with JEE Advanced).

### Regression Risk

Changing template JSON shape without updating worker prompt/normalize logic breaks structured extraction.

### Related Records

- IMP-008 (subject-restart / collision handling)  
- DEC-006 (worker as external processor)  

### Future AI Notes

Always validate template `settings` against real paper structure when debugging “wrong subject” or missing sections.

---

## IMP-003 — Academic Teal Design System Foundation (Milestone 1)

**Timestamp:** 2026-07-23 (date from `CURRENT_STATE.md`; time Unknown)  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented (foundation); page migration incomplete  
**Environment:** Frontend (documented in `CURRENT_STATE.md`)  
**Subsystem:** Frontend design system  

### Problem / Motivation

Inconsistent violet visual language; need shared primitives and tokens for redesign.

### Implementation

Academic Teal token set; Geist typography; primitives such as StatusBadge, EmptyState, Skeleton, etc.; legacy violet class aliases mapped toward teal.

### Approach

Foundation first, then gradual page migration (`Refactor_Blueprint` order referenced in `CURRENT_STATE.md`).

### Why This Approach

Avoid big-bang UI rewrite on monolithic pages.

### Files Changed

- `frontend/src/index.css`  
- `frontend/src/components/design-system/`  
- `frontend/src/lib/design-tokens.js` (as documented)  
- Additional page files: Partially Known  

### Dependencies / Assumptions

Tailwind CSS 4; design tokens as single source of semantic color.

### Alternatives Considered

Unknown.

### Verification

`CURRENT_STATE.md` marks foundation complete; full page adoption still in progress.

### Result

Design foundation available; many pages still mixed legacy + new primitives.

### Regression Risk

Removing violet aliases before page migration breaks UI.

### Related Records

- DEC-003  
- Zone 7 in `CURRENT_STATE.md`  

### Future AI Notes

Do not remove legacy violet aliases yet. New UI should use design-system primitives.

---

## IMP-004 — Shared Question Content Split (`questions` → slots + contents + compatibility view)

**Timestamp:** Unknown  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Database (migration `030_shared_question_content.sql` and follow-ons `031`, `032`, `035`)  
**Subsystem:** Questions domain, worker writes, repositories  

### Problem / Motivation

Need content deduplication / shared bodies across slots while keeping per-mock placement metadata.

### Implementation

- Physical `questions` table renamed to `question_slots`  
- Shared body in `question_contents`  
- Compatibility **VIEW** named `questions` (slots ⋈ contents) so existing `SELECT … FROM questions` kept working  
- Options moved toward `question_contents.options` JSONB; legacy `question_options` later dropped (`035`)  

### Approach

Additive migration + temporary compatibility view; writes target slots/contents; reads often still used the view.

### Why This Approach

Avoid rewriting every repository query in one change.

### Files Changed

- `backend/migrations/030_shared_question_content.sql`  
- `backend/migrations/031_drop_question_code_fields.sql`  
- `backend/migrations/032_question_content_options.sql`  
- `backend/migrations/035_drop_question_options.sql`  
- Worker `replace_questions` paths (target slots/contents)  
- Multiple repositories historically selecting from `questions`  

### Dependencies / Assumptions

Application code may still depend on the `questions` view column shape unless later rewritten (see IMP-013).

### Alternatives Considered

Unknown at original time. Later alternative: drop view and inline join relation (IMP-013).

### Verification

Migrations present; worker comments document write path to `question_slots` / `question_contents`.

### Result

Shared content model live. Compatibility view became a long-lived dependency.

### Regression Risk

Dropping the `questions` view without updating all `FROM questions` call sites breaks API and worker.

### Related Records

- IMP-013 (relation SQL / view drop preparation)  
- DEC-001  

### Future AI Notes

Truth storage is `question_slots` + `question_contents` (+ `question_assets`). Treat `questions` as historical compatibility, not physical table, unless current DB still has the view.

---

## IMP-005 — Multi-Slot Diagram Assets

**Timestamp:** Unknown (migration `040_question_assets_multi_image.sql`; earlier diagram migrations `009`, `014`, `015`, `029`)  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Database + worker + frontend  
**Subsystem:** Diagrams, question editor, extraction  

### Problem / Motivation

Questions need multiple images (stem + options), not a single default diagram.

### Implementation

`question_assets` with `slot_key` / placement; text markers `![[img:slot_key]]`; worker crops and uploads; frontend resolves via diagram asset maps / providers.

### Approach

Slot keys + Cloudinary storage + API attachment of `diagramAssets` arrays.

### Why This Approach

Preserves multiple images without encoding binary in Postgres.

### Files Changed

- `backend/migrations/009_question_assets.sql`  
- `backend/migrations/014_diagram_manual_crop.sql`  
- `backend/migrations/015_diagram_manual_insert.sql`  
- `backend/migrations/029_diagram_single_image.sql`  
- `backend/migrations/040_question_assets_multi_image.sql`  
- Worker asset extractor / AI diagram attachment  
- Frontend editor diagram controls, `MathText` / ImageNode paths  

### Dependencies / Assumptions

Cloudinary configured on worker and API; stable public ID strategy interacts with cache versioning (IMP-006).

### Alternatives Considered

Unknown.

### Verification

Partially Known — multi-image path exists in code; production edge cases (missing image UI) fixed later (IMP-009).

### Result

Multi-diagram questions supported; crop/replace/edit evolved over follow-on IMPs.

### Regression Risk

Mapper drops of `diagramAssets` or missing `DiagramAssetsProvider` show “Missing image” despite Cloudinary objects existing.

### Related Records

- IMP-006, IMP-009, IMP-010, IMP-011, IMP-016  
- DEC-004  

### Future AI Notes

Always pass `diagramAssets` through list/detail mappers and wrap preview surfaces with the assets provider.

---

## IMP-006 — Diagram URL Cache Versioning

**Timestamp:** 2026-08-27 (date from `CURRENT_STATE.md`; time Unknown)  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Verified (per `CURRENT_STATE.md` historical warning)  
**Environment:** Production + local (as documented)  
**Subsystem:** Diagram delivery, Cloudinary, question editor  

### Problem / Motivation

After replace/crop, editor still showed old diagram due to browser + CDN cache (`Cache-Control` / stable URLs).

### Implementation

Version diagram URLs with `?v=<created_at_ms>`; Cloudinary upload `overwrite` + `invalidate`; frontend remounts `<img>` when URL changes.

### Approach

Stable public IDs + timestamp query/version segment rather than random new public IDs for every edit.

### Why This Approach

Keeps ID scheme stable while forcing cache miss on change.

### Files Changed

- `backend/src/lib/diagram-cache-version.js` (as documented)  
- Cloudinary upload helpers  
- Question asset replace/crop paths  
- Frontend diagram `<img>` rendering  

### Dependencies / Assumptions

`question_assets.created_at` bumps on replace/crop.

### Alternatives Considered

Unknown.

### Verification

Documented as fixed 2026-08-27 in `CURRENT_STATE.md`.

### Result

Stale diagram display resolved when versioning + invalidate + remount remain intact.

### Regression Risk

Removing any of versioning / invalidate / remount reintroduces the bug.

### Related Records

- DEC-004  
- CURRENT_STATE Warning 1  
- IMP-005  

### Future AI Notes

Do not “simplify” diagram URLs by stripping `v=`. Coordinate frontend, API, and Cloudinary changes.

---

## IMP-007 — Google Sign-In and User Avatar Storage

**Timestamp:** Unknown (migrations `038_google_sign_in.sql`, `039_user_avatar_upload.sql`)  
**AI / Agent:** Unknown  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Database + auth (production OAuth partially environment-dependent)  
**Subsystem:** Auth, profile  

### Problem / Motivation

Support Google OAuth accounts and profile avatars (including Google picture and uploaded avatars).

### Implementation

Google ID fields; avatar URL / public_id / updated_at; settings/profile upload path to Cloudinary.

### Approach

JWT auth remains primary session mechanism; Google validates token server-side; avatar stored in Cloudinary.

### Why This Approach

Fits existing JWT model (`DEC-005`) without server sessions.

### Files Changed

- `backend/migrations/038_google_sign_in.sql`  
- `backend/migrations/039_user_avatar_upload.sql`  
- Auth services/controllers (exact set: Partially Known)  
- Settings UI avatar section  

### Dependencies / Assumptions

`GOOGLE_CLIENT_ID` / related env per environment; Cloudinary for uploads.

### Alternatives Considered

Unknown.

### Verification

`CURRENT_STATE.md` lists signup/OAuth as verified; redirect URI misconfiguration remains a deployment risk.

### Result

Google login and avatar fields available; avatar initially strongest in Settings until UI expansion (IMP-012).

### Regression Risk

OAuth redirect URI mismatches break login in new deployments.

### Related Records

- DEC-005  
- IMP-012  
- CURRENT_STATE Warning 3  

### Future AI Notes

Test OAuth on each new domain; never log client secrets.

---

## IMP-008 — Extraction Merge Fingerprint / Subject Restart Handling

**Timestamp:** Partially Known (session work ~2026-08-29; no authoritative commit)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented (code path); production verification Unknown  
**Environment:** Worker AI merge logic  
**Subsystem:** Worker extraction, AI reconcile  

### Problem / Motivation

JEE Advanced-style papers restart question numbers per subject. Merge keyed only by `question_no` overwrote Mathematics with Chemistry while still reporting a plausible total count.

### Implementation

Fingerprint / safer `_put_extracted_question` behavior so subject restarts do not silently clobber distinct questions; related template context still required for section alignment.

### Approach

Prefer identity beyond bare question number when inserting into the in-memory merge map.

### Why This Approach

Minimal change inside existing merge pipeline vs full renumber rewrite only.

### Files Changed

- `backend/worker/ai/provider.py` (merge helpers)  
- Possibly related normalize/schema helpers (Partially Known)  

### Dependencies / Assumptions

Vision/text extraction still returns per-question payloads; templates may still mislabel topics if wrong.

### Alternatives Considered

Unknown.

### Verification

Diagnosed from user-provided `output_summary` + sample questions (Chemistry-only topics with full count). Fix shipped in session artifacts; independent production re-run evidence: Unknown.

### Result

Addresses number-collision class of bugs; template correctness remains separate.

### Regression Risk

Over-aggressive dedup could drop legitimate duplicates; under-aggressive leaves collisions.

### Related Records

- IMP-002  
- Related debugging should be recorded in `DEBUG_LOG.md` when that file is maintained  

### Future AI Notes

When “count looks right but subjects wrong,” inspect merge keys and template settings before blaming the PDF.

---

## IMP-009 — Frontend Diagram Asset Resolution (“Missing image”)

**Timestamp:** Partially Known (~2026-08-29 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Partially Verified (user confirmed after iterated fixes)  
**Environment:** Browser + API response shape  
**Subsystem:** Output/review UI, question mappers  

### Problem / Motivation

UI showed “Missing image” for option/stem diagrams that existed in Cloudinary.

### Implementation

Ensure `diagramAssets` survives `toEditorQuestion` / list mappers; wrap Output tab / cards with `DiagramAssetsProvider`; harden slot key handling.

### Approach

End-to-end path fix (API → mapper → provider → MathText/ImageNode) rather than re-upload.

### Why This Approach

Assets already stored; bug was resolution/plumbing.

### Files Changed

- Frontend mapper helpers (e.g. `toEditorQuestion` / related)  
- `OutputTab` / bank card provider wiring (Partially Known exact filenames in final tree)  
- `MathText` / ImageNode marker resolution  

### Dependencies / Assumptions

API still attaches `diagramAssets` for questions.

### Alternatives Considered

Unknown.

### Verification

User reported success after repeated “still same” iterations once provider + mapper landed.

### Result

Missing-image UI resolved for the reported path without mandatory reprocess.

### Regression Risk

New preview surfaces that skip the provider will regress.

### Related Records

- IMP-005  
- IMP-006  

### Future AI Notes

Any new question preview must receive `diagramAssets` context.

---

## IMP-010 — Editable Option Diagrams

**Timestamp:** Partially Known (~2026-08-29 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Browser editor  
**Subsystem:** Question editor  

### Problem / Motivation

Stem diagrams were editable (crop/replace); option diagrams were not.

### Implementation

Extended ImageNode / crop modal / upload controls to option slots with per-slot API operations.

### Approach

Reuse stem diagram pipeline with `slotKey` parameterization.

### Why This Approach

Consistent UX; avoids second storage model.

### Files Changed

- ImageNode / DiagramCropModal / DiagramUploadControl (under `frontend/src/components/question-editor/`)  
- Question asset API routes supporting optional slot key  

### Dependencies / Assumptions

Multi-slot schema (IMP-005).

### Alternatives Considered

Unknown.

### Verification

Session implementation; formal QA matrix: Unknown.

### Result

Option diagrams can be cropped/replaced like stem diagrams.

### Regression Risk

Slot key mismatches can edit the wrong asset.

### Related Records

- IMP-005, IMP-009, IMP-011, IMP-016  

### Future AI Notes

Preserve slot key through crop upload/delete APIs.

---

## IMP-011 — Expanded Diagram Crop Padding (~2× Detection Box)

**Timestamp:** Partially Known (~2026-08-29 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Worker extraction  
**Subsystem:** Worker diagram crop  

### Problem / Motivation

Option diagrams often clipped because crops used tight model bounding boxes.

### Implementation

Increase crop padding (approximately 50% per side → ~2× width/height) so imperfect detections still include usable context; user can tighten via editor crop.

### Approach

Change crop geometry in asset extractor rather than only trusting model boxes.

### Why This Approach

User-requested tradeoff: slightly larger images vs permanent clipping.

### Files Changed

- `backend/worker/asset_extractor.py` (padding parameter)  

### Dependencies / Assumptions

Vision model still returns boxes; padding clamped to page bounds.

### Alternatives Considered

Persist full page only (rejected for storage/UX complexity at the time).

### Verification

Implemented per request; quantitative crop QA: Unknown.

### Result

Fewer clipped option figures at extraction time.

### Regression Risk

Over-padding may include neighboring text; users rely on manual crop.

### Related Records

- IMP-005, IMP-010  

### Future AI Notes

Do not remove padding without an alternate recovery path (page fetch UI — IMP-016).

---

## IMP-012 — Avatar Surfaces Beyond Settings

**Timestamp:** Partially Known (~2026-08-28 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Frontend  
**Subsystem:** User menu, team, students, invitations, public catalog  

### Problem / Motivation

Custom/Google avatars worked in Settings but not consistently in top nav and collaboration surfaces.

### Implementation

Shared avatar resolution + `UserAvatar`-style usage in nav, student, team, invitation, and publisher/catalog card contexts.

### Approach

Centralize URL resolution (uploaded vs Google) and reuse one component.

### Why This Approach

Prevents divergent fallback logic.

### Files Changed

- Frontend avatar helper/component  
- UserMenu / MemberRow / invitations / catalog modal surfaces (Partially Known exact set)  

### Dependencies / Assumptions

IMP-007 avatar fields populated.

### Alternatives Considered

Unknown.

### Verification

Session delivery; full UI matrix: Unknown.

### Result

Avatars visible in requested collaboration/catalog surfaces.

### Regression Risk

Broken resolve helper yields empty images or wrong initials.

### Related Records

- IMP-007  

### Future AI Notes

Prefer shared avatar component; do not hardcode Google photo URL rules in each page.

---

## IMP-013 — `questions` View Dec-Risk Path (Inline Relation SQL)

**Timestamp:** Partially Known (~2026-08-29 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Partially Implemented / Partially Verified  
**Environment:** API repositories + worker (code present in session artifacts; migration `041` may or may not be applied in a given deploy)  
**Subsystem:** Questions read path  

### Problem / Motivation

Desire to drop legacy `questions` compatibility view while many modules still queried `FROM questions`.

### Implementation

- Shared SQL fragment: `QUESTIONS_RELATION_SQL` as `(question_slots ⋈ question_contents)`  
- JS helper `backend/src/lib/questions-relation-sql.js`  
- Python helper `backend/worker/questions_relation_sql.py`  
- Repositories/services/worker duplicate paths updated to interpolate the relation  
- Draft migration `041_drop_questions_compatibility_view.sql` to `DROP VIEW IF EXISTS questions`  

### Approach

Replace view dependency with identical inline subquery shape so column names stay stable.

### Why This Approach

Allows dropping the view without a second full rewrite of SELECT lists.

### Files Changed

- `backend/src/lib/questions-relation-sql.js`  
- `backend/worker/questions_relation_sql.py`  
- Multiple `backend/src/repositories/*.js`  
- `backend/src/services/questions.service.js`  
- `backend/worker/db.py`, `duplicate_detector.py`  
- Optional `backend/migrations/041_drop_questions_compatibility_view.sql`  

### Dependencies / Assumptions

Deploy code **before** applying drop-view migration.

### Alternatives Considered

Keep the view forever (simpler ops, hides true schema). Rejected for schema honesty once call sites updated.

### Verification

Code search showed call sites updated in session zip; production migration apply status: Unknown.

### Result

Read path can survive without the view if migration applied after code deploy.

### Regression Risk

Applying `041` before deploying relation SQL causes `relation "questions" does not exist`.

### Related Records

- IMP-004  

### Future AI Notes

Confirm whether `questions` view still exists in the target database before assuming either model.

---

## IMP-014 — Worker HTTP Wrapper + API `kickWorker` Trigger

**Timestamp:** Unknown (architecture present in repo; refined in 2026-08-30 session)  
**AI / Agent:** Partially Known (session + prior work)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented  
**Environment:** Production worker Web Service + API (behavior environment-dependent)  
**Subsystem:** Deployment, job queue wake-up  

### Problem / Motivation

Worker as always-on free process is costly/limited on Render; need HTTP-triggerable worker and API-side kick when jobs queue.

### Implementation

- `python -m worker.http_server` exposes `POST /run` (token query param)  
- `backend/src/lib/worker-runner.js` `kickWorker()` POSTs to `WORKER_SERVICE_URL` when configured  
- Local dev fallback: spawn `python -m worker.worker --once` when deployed URL not set  
- `queueProcessingJob` in mock-tests service calls `kickWorker` after commit  

### Approach

Fire-and-forget kick after durable job insert; job correctness does not depend on kick success.

### Why This Approach

Aligns with free-tier spin-down while avoiding mandatory external cron for the happy path.

### Files Changed

- `backend/worker/http_server.py`  
- `backend/src/lib/worker-runner.js`  
- `backend/src/services/mock-tests.service.js`  

### Dependencies / Assumptions

Both `WORKER_SERVICE_URL` and `WORKER_TRIGGER_SECRET` set on **API** service; same secret on worker.

### Alternatives Considered

Cron-only pinger (optional backstop; user preferred not to rely on it).

### Verification

Production: curl to worker `/run` returned `202` when healthy; upload path later showed kicks occurring (see IMP-015).

### Result

Upload can wake worker without manual terminal — when worker service is healthy.

### Regression Risk

Missing API env vars → local spawn on Render (no-op) or silent failure; see IMP-015.

### Related Records

- DEC-006  
- IMP-015  
- IMP-016 (reuses worker HTTP + secret)  

### Future AI Notes

Distinguish “kick not called” vs “kick called but worker 502.” Check API logs for `[worker-runner]`.

---

## IMP-015 — Worker Kick Hardening (Production Guard + 502 Retries)

**Timestamp:** Partially Known (~2026-08-30 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Partially Verified  
**Environment:** Production API logs observed; worker health still operational concern  
**Subsystem:** `worker-runner.js`  

### Problem / Motivation

Jobs stayed `queued` until manual curl. Logs later showed kicks **were** sent but received **502 HTML** from Render while worker cold-started or stayed unhealthy. Early single-shot kick + huge HTML log dump worsened ops. Missing env on API previously risked useless local spawn.

### Implementation

- Detect deployed environment; do not fall back to local Python spawn when URL/secret missing in production  
- Retry kick on 502/503/504 (multiple attempts, delay between tries)  
- Truncate HTML error bodies in logs  
- Log attempt/accept clearly  

### Approach

Tolerate free-tier cold start in the API kick path without blocking upload HTTP response (async retries).

### Why This Approach

Matches observed Render behavior: first requests 502 during boot; manual curl works after listen.

### Files Changed

- `backend/src/lib/worker-runner.js`  

### Dependencies / Assumptions

Worker process must eventually bind `PORT` and stay up. Retries cannot fix a crashed/suspended service.

### Alternatives Considered

Paid always-on worker; external warm pings — ops choices, not required for code path.

### Verification

**Production (API logs):** Retries executed (attempts 1–6) with truncated HTML — confirms code path.  
**Production (worker):** Persistent 502 across all attempts indicates worker not healthy, not missing kick wiring.  
**Local:** Unknown in that session.

### Result

Clearer diagnosis; cold-start success possible when worker boots within retry window. Does not repair a down worker.

### Regression Risk

Long retry loops add background load; still fire-and-forget relative to user request.

### Related Records

- IMP-014  
- Should link to `BUG-*` entries for worker 502 / cold start when `DEBUG_LOG.md` is filled  

### Future AI Notes

If all kick attempts are 502, debug worker runtime logs and start command — do not keep patching the API kick alone.

---

## IMP-016 — Fetch PDF Page Image for Manual Diagram Crop (Option A)

**Timestamp:** Partially Known (~2026-08-30 session merge)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented in codebase merge; production verification Unknown  
**Environment:** Worker render endpoint + API proxy + editor UI  
**Subsystem:** Diagram recovery UX, worker HTTP, mock-test PDF access  

### Problem / Motivation

When extraction misses a diagram, users should crop from the original PDF page without uploading an external image. PDFs live in object storage; only the worker already rendered pages with PyMuPDF.

### Implementation

**Chosen approach: Option A — Node asks Python worker to render a page on demand.**

- Worker `GET /render-page` (auth via existing trigger secret): download PDF, render page at `AI_PDF_RENDER_SCALE`, return PNG + total pages header  
- Separate concurrency pool `WORKER_RENDER_CONCURRENCY`  
- API: `pdf-page-render-client.js`, service, controller, route `GET /api/mock-tests/:mockTestId/pdf-page?page=N`  
- Frontend: `fetchPdfPage`, `PdfPageFetchModal`, “Fetch from PDF” on diagram upload control; crop client-side then existing upload path  
- `sourcePage` plumbed on editor question objects from `source_page`  

### Approach

Reuse worker PDF stack and secret boundary; API remains workspace-scoped gate.

### Why This Approach

User selected Option A over:

- **B** Node-side PDF rasterization (second renderer, deploy friction)  
- **C** Persist every page image at extraction time (storage cost)  

### Files Changed

- `backend/worker/config.py`  
- `backend/worker/http_server.py`  
- `backend/src/lib/pdf-page-render-client.js`  
- `backend/src/services/pdf-page.service.js`  
- `backend/src/controllers/pdf-page.controller.js`  
- `backend/src/routes/mock-tests.routes.js`  
- `frontend/src/lib/api.js`  
- `frontend/src/utils/questionEditorHelpers.js`  
- `frontend/src/components/question-editor/PdfPageFetchModal.jsx`  
- `frontend/src/components/question-editor/DiagramUploadControl.jsx`  
- `frontend/src/components/question-editor/QuestionPreviewCard.jsx`  

### Dependencies / Assumptions

Same cold-start / 502 risks as `/run` (IMP-014/015). Custom headers (e.g. total pages) must be CORS-exposed if cross-origin.

### Alternatives Considered

B and C as above; user chose A.

### Verification

Syntax/merge sanity checked in session; end-to-end production fetch-after-idle: Unknown.

### Result

Editor can request page raster via API → worker for manual diagram recovery.

### Regression Risk

Heavy render traffic can contend with job threads if concurrency pools misconfigured; worker downtime blocks feature.

### Related Records

- IMP-005, IMP-010, IMP-011, IMP-014, IMP-015  
- DEC-006  

### Future AI Notes

Do not implement a second ad-hoc PDF renderer in Node without an explicit decision superseding Option A. Keep render scale aligned with extraction for visual consistency.

---

## IMP-017 — README and Public Project Documentation Snapshot

**Timestamp:** Partially Known (~2026-08-29 session)  
**AI / Agent:** Partially Known (session coding agent)  
**Branch:** Unknown  
**Commit:** Unknown  
**Status:** Implemented (doc artifact)  
**Environment:** Repository docs  
**Subsystem:** Documentation  

### Problem / Motivation

Need external-facing README covering architecture, setup, worker, diagrams, and schema overview.

### Implementation

Detailed `README.md` including mermaid ER diagram of major tables and relationships.

### Approach

Single root README as onboarding entry; schema diagram mirrors product tables.

### Why This Approach

Conventional open-source/onboarding practice.

### Files Changed

- `README.md`  

### Dependencies / Assumptions

None runtime.

### Alternatives Considered

Unknown.

### Verification

File produced in session artifacts.

### Result

Human/AI onboarding doc available; may lag schema if not updated after migrations.

### Regression Risk

Stale README misleads; prefer migrations + `CURRENT_STATE.md` for truth.

### Related Records

None required.

### Future AI Notes

When schema changes materially, update README mermaid or point to migrations.

---

# Appendix — ID Allocation Notes

| ID range | Theme |
| -------- | ----- |
| IMP-001–004 | Core schema, templates, design foundation, question split |
| IMP-005–007 | Diagrams, cache versioning, Google/avatar |
| IMP-008–013 | Extraction quality, diagram UI fixes, avatar surfaces, view de-risk |
| IMP-014–016 | Worker deploy kick, 502 hardening, PDF page fetch |
| IMP-017 | Documentation snapshot |

Next new implementation should use **IMP-018** (or higher if concurrent agents appended entries — always scan for max ID first).

BUG / DEC numeric IDs referenced from `CURRENT_STATE.md` (DEC-001…007, diagram warning) are authoritative there until `DECISION_LOG.md` / `DEBUG_LOG.md` are fully populated. Prefer creating matching DEC/BUG files rather than inventing parallel numbers.

---

**End of IMPLEMENTATION_LOG.md**
