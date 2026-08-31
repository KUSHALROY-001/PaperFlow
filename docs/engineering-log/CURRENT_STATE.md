# CURRENT_STATE.md — PaperFlow Project Status

**Last updated:** 2026-08-31
**Status:** Active development with design system migration in progress

---

## Mini-Manual: How to Use This File

### What This File Is

This file is the current snapshot of PaperFlow's codebase, architecture, and verified state. It answers: **"If I am an AI starting work on this codebase today, what do I need to know before changing anything?"**

### When an AI Should Read It

Read this file **first**, before modifying any code. It takes 5–10 minutes and will save you from repeating mistakes, undoing another AI's work, or conflicting with planned architecture.

### How an AI Should Use It

Use it to understand:

- Current architecture and technology stack
- Current integrations and dependencies
- Current verified behavior vs. unverified claims
- Current active issues and risks
- Important historical warnings that still apply
- Conflict zones where multiple AIs could create breaking changes
- Which areas require extra investigation before changes

### How an AI Should Update It

- Keep it concise. Describe current state, not historical narratives.
- If information becomes outdated, correct it here and reference the relevant log entry (e.g., `IMP-021`, `BUG-014`).
- Do not rewrite historical logs. Use references instead:
  ```
  Current behavior: [description]
  Related: IMP-XXX, DEC-YYY (see IMPLEMENTATION_LOG.md, DECISION_LOG.md)
  ```
- After completing significant changes, update relevant sections.
- Move historical details to appropriate logs (IMPLEMENTATION_LOG.md, DEBUG_LOG.md, DECISION_LOG.md).

### Important Rule

**Current code and verified runtime behavior take priority over historical documentation.** If old docs say one thing but the current code does another, the code is right — note the discrepancy and update here.

---

## 1. Project Overview

**What:** PaperFlow is an end-to-end platform for educators, coaching institutes, and exam-prep teams to upload scanned or digital question papers, automatically extract structured questions (including diagrams and multi-image options), review and edit them in a rich editor, and publish as mock tests for students.

**Purpose:** Automate the heavy lift of converting messy PDFs into usable mock tests (extract → structure → attach diagrams), then provide a proper UI for human review and correction.

**Current Development Stage:** Active feature development with active design system migration. Core platform is functional and deployed. Redesign (foundation → pages) is underway with design-system foundation milestone completed (2026-07-23).

**Live Demo:** https://paperflow-ki5w.onrender.com/
**Repository:** https://github.com/KUSHALROY-001/PaperFlow

---

## 2. Technology Stack

### Frontend

- **Framework:** React 19.2.6
- **Build Tool:** Vite 8.0.12
- **Routing:** React Router 7.11.0
- **State & Data Fetching:** TanStack Query 5.101.0
- **Styling:** Tailwind CSS 4.3.0 + @tailwindcss/vite 4.3.0
- **UI Primitives:** Radix UI (alert-dialog, slot)
- **Rich Text:** TipTap 3.30.2 (core, starter-kit, tables)
- **Math:** KaTeX 0.16.11 + Mathlive 0.110.0
- **PDF Manipulation:** pdf-lib 1.17.1 + @pdf-lib/fontkit 1.1.1
- **Image Cropping:** react-image-crop 11.1.2
- **Charting:** Recharts 3.8.1
- **Animation:** Framer Motion 12.42.2
- **Themes:** next-themes 0.4.6
- **Markdown:** prosemirror-markdown 1.13.2
- **Icons:** lucide-react 1.17.0
- **Utilities:** clsx, class-variance-authority, tailwind-merge

### Backend

- **Runtime:** Node.js 22.x
- **Framework:** Express 5.2.1
- **Database:** PostgreSQL 16
- **Database Client:** pg 8.23.0
- **Authentication:** jsonwebtoken 9.0.3, bcryptjs 3.0.3, google-auth-library 9.14.2
- **File Upload:** multer 2.2.0
- **Image Processing:** sharp 0.35.3, Puppeteer 25.7.0
- **Storage:** Cloudinary 2.5.1, AWS S3 SDK (@aws-sdk/client-s3 3.699.0, @aws-sdk/s3-request-presigner 3.699.0)
- **Environment:** dotenv 16.4.7
- **Logging:** morgan 1.11.0
- **CORS:** cors 2.8.6
- **Math:** KaTeX 0.18.4

### Worker (Python)

- **Language:** Python 3.x
- **Database:** psycopg2 (via PostgreSQL client)
- **PDF Processing:** PyMuPDF (fitz)
- **OCR:** Tesseract (via pytesseract)
- **Image Processing:** Pillow
- **AI Providers:** Gemini API, OpenAI API
- **Configuration:** dotenv for environment loading
- **Concurrency:** Python ThreadPoolExecutor for parallel job processing

### Storage

- **Primary:** Cloudinary (diagrams, question assets, user avatars)
- **Alternative:** AWS S3 (configurable)
- **Local Development:** File system during development

### Authentication

- **Primary:** Email + password (bcrypt-hashed)
- **OAuth:** Google Sign-In (google-auth-library)
- **JWT:** Token-based session management

### Database

- **Engine:** PostgreSQL 16
- **Extensions:** pgcrypto (UUIDs), citext (case-insensitive emails)
- **Schema Management:** Migrations (42+ migrations in `backend/migrations/`)
- **ORM:** None; raw parameterized SQL in repositories

### Deployment

- **Frontend:** Vite build → hosted on Render (or similar static host)
- **Backend:** Node.js server on Render Web Service
- **Worker:** Python process (http_server.py for Render cron-triggered runs, or worker.py for local/continuous)
- **Database:** PostgreSQL instance (managed service or docker)

### Development

- **Local Database:** Docker (compose.yaml with postgres:16)
- **Node Watch Mode:** `node --watch` in dev script
- **Package Manager:** npm

---

## 3. Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                         │
│                   (frontend/)                                   │
│  Pages → Features → Components → Design System Primitives       │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP REST API calls
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Express 5 REST API                            │
│                   (backend/src/)                                │
│  Routes → Controllers → Services → Repositories → PostgreSQL    │
│                   (4-layer architecture)                        │
└───────────────────┬──────────────────────┬──────────────────────┘
                    │                      │
        ┌───────────┴──────────┐   ┌──────┴──────────────┐
        │                      │   │                     │
        ↓                      ↓   ↓                     ↓
   PostgreSQL          Cloudinary         AWS S3    Python Worker
   (Schema +      (Diagrams, Assets,      (PDF    (Extraction,
    Data)        Avatars, Storage)        Files)   OCR, AI)
                                                      │
                                                      ↓
                                         Gemini/OpenAI API
```

### Request Flow Example (Question Upload)

1. Frontend: User uploads PDF via `QuestionEditor`
2. Backend: `POST /api/mock-tests/:id/process` → routes → controller
3. Controller: Calls `mock-tests.service.uploadDocument()`
4. Service: Validates, stores to Cloudinary, queues job
5. Database: Creates `processing_job` row with `queued` status
6. Worker: Polls DB, claims job, downloads PDF
7. Worker: Extracts pages → OCR (fallback) → parse questions → AI enhancement
8. Worker: Uploads diagrams to Cloudinary, stores question data back to DB
9. Frontend: Polls `/api/processing-jobs/:id` for status, displays timeline
10. Frontend: Once done, renders review queue with extracted questions

---

## 4. Major Components

### Frontend: Question Editor

**Purpose:** Rich editing interface for questions, options, diagrams, explanations.
**Location:** `frontend/src/pages/QuestionEditor.jsx`, `frontend/src/components/question-editor/`
**Important Behavior:**

- Supports KaTeX and MathLive for formulas
- Per-slot diagram controls (upload, replace, crop, clear)
- TipTap rich text editor for stem and explanations
- Remounts diagram `<img>` when URL changes (v=cache-bust parameter)
- Versioned diagram URLs from `question_assets.created_at` to bust browser cache

**Related:** IMP-XXX (Diagram caching fix, 2026-08-27)

### Backend: Processing Jobs & Worker Queue

**Purpose:** Async PDF extraction pipeline with rate limiting and job state tracking.
**Location:** Backend: `src/services/processing-jobs.service.js`, `src/repositories/processing-jobs.repository.js`; Worker: `worker/worker.py`, `worker/config.py`
**Important Behavior:**

- Job states: `queued` → `running` → `completed` / `failed` / `cancelled`
- Cancellation: Reprocessing a mock test calls `cancelActiveProcessingJobs()` first
- Worker concurrency: Configurable threads per process (default 4); each thread claims with `FOR UPDATE SKIP LOCKED`
- Rate limiting: Module-level lock in `gemini_provider.py` (shared across threads in one process only)
- If multiple worker processes run against same `GEMINI_API_KEY`, each gets own rate limiter (risk of exceeding quota)
- PDF download → page extraction → OCR fallback → question parse → AI enhancement → diagram upload → DB write

**Configuration Names (No Secrets):**

- `WORKER_POLL_INTERVAL_SECONDS` → Polling frequency (default 5s)
- `WORKER_MAX_JOBS_PER_RUN` → Batch size per HTTP /run call (default 8)
- `WORKER_CONCURRENCY` → Thread pool size (default 4)
- `AI_MAX_REQUESTS_PER_MINUTE` → Rate limit per process
- `AI_DUPLICATE_REGEN_THRESHOLD` → Confidence threshold for auto-regenerating flagged duplicates

### Backend: Questions & Review Queue

**Purpose:** Store structured questions, manage review/approval workflow, duplicate detection.
**Location:** `src/services/questions.service.js`, `src/repositories/questions.repository.js`, `src/services/review-queue.service.js`
**Important Behavior:**

- Question status: `needs_review` → `approved` / `rejected`
- Confidence signals: Stored with every extracted question
- Duplicates: Auto-detected, flagged for manual merge or auto-merge depending on threshold
- Multi-correct support: `question_type` enum: `single` / `multi`
- Diagram support: Multiple diagrams per question (stem + each option slot)
- Code support: Syntax highlighting; questions store `code_language` and `code_content`
- Math support: Validated with `math-validator.js`; questions with code stored separately from pure text

**Related:** Multiple recent fixes to extraction quality and formatting

### Backend: Mock Tests & Clusters

**Purpose:** Organize mock tests into hierarchical clusters, track processing status, handle publishing.
**Location:** `src/services/mock-tests.service.js`, `src/repositories/mock-tests.repository.js`, `src/services/clusters.service.js`
**Important Behavior:**

- Status flow: `draft` → `processing` → `review` → `published` / `archived`
- Each mock test belongs to exactly one cluster
- Clusters belong to one workspace
- Questions in a published mock test can be reused across other tests via `question_bank`
- Settings stored as JSONB (marking scheme, time limits, section layouts)
- Duration: Stored as `duration_minutes` (default 120)

### Backend: Authentication & Workspace

**Purpose:** User login (email + password, Google OAuth), workspace isolation, role-based access.
**Location:** `src/services/auth.service.js`, `src/middleware/require-role.js`
**Important Behavior:**

- Auth tokens: JWT, issued on login, validated on protected routes
- Workspace roles: `owner` / `admin` / `editor` / `viewer`
- Authorization: Checked via `requireRole(roleName)` middleware
- Google OAuth: Configured via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Profile: Users can upload avatars (stored in Cloudinary)
- Email validation: Case-insensitive (citext column)

**Frontend Auth Flow:**

1. User navigates to `/auth`
2. Login form with email + password OR Google Sign-In button
3. On submit → `auth.service.login()` or `auth.service.googleSignIn()`
4. Backend returns JWT token + user data
5. Frontend stores token in localStorage (or memory)
6. Subsequent requests include token in `Authorization: Bearer` header
7. Backend validates via `requireAuth()` middleware

### Backend: Students & Cohorts

**Purpose:** Manage student groups, track attempts, link to teams.
**Location:** `src/services/students.service.js`, `src/services/cohorts.service.js`
**Important Behavior:**

- Cohorts: Collections of students within a workspace
- Attempt tracking: Each student's attempt on a mock test recorded with score, duration, status
- Status: `in_progress` / `submitted` / `abandoned`
- Leaderboards: Generated from attempt data

### Backend: Team & Invitations

**Purpose:** Workspace member management, invite workflow.
**Location:** `src/services/team.service.js`
**Important Behavior:**

- Invite: Owner/admin sends invite link with one-time token
- Accept: Invitee creates account or links existing account via token
- Roles: Set at invite time, can be changed post-acceptance
- Revocation: Pending invites can be cancelled

### Backend: Public Catalog & Sharing

**Purpose:** Allow publishing mock tests for public discovery, shareable links for students.
**Location:** `src/services/catalog.service.js`, `src/services/shared.service.js`
**Important Behavior:**

- Public catalog: Published mock tests indexed for discovery
- Shared links: Generate time-limited or permanent share URLs
- Access control: Students access shared mocks via link; no auth required (or optional)
- Publisher subscriptions: Track which catalogs are subscribed to by which workspaces

### Frontend: Design System (Milestone 1 Complete)

**Purpose:** Unified visual language and reusable components.
**Location:** `frontend/src/index.css`, `frontend/src/components/design-system/`, `frontend/src/lib/design-tokens.js`
**Current State:** Academic Teal foundation implemented (2026-07-23)
**Components:** StatusBadge, ConfidenceBadge, StatTile, EmptyState, Skeleton, ProgressStepper, JobCard, OptionSelector, ConfirmDialog, DataTable
**Typography:** Geist Sans + Geist Mono from Google Fonts with system fallbacks
**Legacy Compatibility:** Old violet classes mapped to teal equivalents (`gradient-violet` → solid teal, `card-lavender` → teal surface)
**Remaining Work:** Page-level migrations to use new primitives; AppShell redesign pending

### Frontend: Feature Architecture (Planned)

**Status:** Defined in refactor blueprint; currently mixed page-centric with some features
**Target Structure:** `frontend/src/features/<feature>/{components/, hooks/, services/, utils/}`
**Examples (Needed):** clusters, mock-tests, questions, review-queue, attempts, team, integrations

---

## 5. Frontend State

### Technology & Structure

- **Build:** Vite with React 19
- **Routing:** React Router 7 (SPA-based)
- **State:** TanStack Query 5 (server state); React Context for auth + theme
- **Styling:** Tailwind CSS + custom design-system components

### Architecture Status

**Current:** Mixed page-centric and component-centric; monolithic pages (e.g., MockTestWorkspace 700+ LOC)
**Target:** Feature-first, with thin pages and extracted components/hooks
**Foundation Status:** Design system primitives in place; pages still under migration
**Blocking Issues:** Large pages needed refactoring before page-level redesigns can be completed

### Important Pages

1. **Dashboard** (`src/pages/Dashboard.jsx`) — Main entry point; summary stats
2. **Clusters Library** (`src/pages/ClustersLibrary.jsx`) — Browse/create clusters
3. **Cluster Workspace** (`src/pages/ClusterWorkspace.jsx`) — Mock test management within cluster
4. **Mock Test Workspace** (`src/pages/MockTestWorkspace.jsx`) — Tabs: overview, processing, review, output
5. **Question Editor** (`src/pages/QuestionEditor.jsx`) — Rich editor for questions
6. **Mock Session** (`src/pages/MockSession.jsx`) — Student attempt flow
7. **Analytics** (`src/pages/Analytics.jsx`) — Performance charts
8. **Team** (`src/pages/Team.jsx`) — Member management
9. **Settings** (`src/pages/Settings.jsx`) — User profile, preferences
10. **Landing** (`src/pages/Landing.jsx`) — Public homepage

### API Communication

- **Service Layer:** `frontend/src/lib/api.js` (fetch wrapper with auth headers)
- **TanStack Query:** Used for caching, refetching, mutations
- **Polling:** Processing jobs polled at regular intervals
- **Auth:** Token stored in localStorage; included in `Authorization` header

### Frontend-Backend Contracts (Conflict Zones)

1. **Question Structure:** Frontend expects fields like `stem`, `options`, `diagramUrl`, `confidence`, `status`
2. **Job Status:** Frontend renders based on `processing_job.status` enum values
3. **Diagram URLs:** Versioned with `?v=<timestamp>` to bust cache; backend sets `created_at` on assets
4. **Error Responses:** Backend returns `{ error, message, code }` format; frontend parses this
5. **Pagination:** Some endpoints paginate; frontend must handle cursor or offset parameters

### Design System Usage

**Current:** Partially applied; old violet classes still in use
**Expected:** All new components use design-system primitives
**Legacy Classes:** Temporarily aliased to teal equivalents for backward compatibility

---

## 6. Backend State

### Framework & Structure

- **Framework:** Express 5 (ES modules)
- **Architecture:** Strict 4-layer (routes → controllers → services → repositories)
- **Middleware:** asyncHandler, requireAuth, requireRole, CORS, multer for uploads
- **Database:** Raw parameterized SQL (no ORM)

### Route Structure

**Routes are thin wiring:**

- Path definition + HTTP method
- Middleware guards (requireAuth, requireRole)
- Controller function wrapper in asyncHandler
- **Under 40 lines per routes file**

**Routes Files:** 17 domain files covering auth, clusters, mock-tests, questions, processing-jobs, review-queue, team, students, cohorts, attempts, catalog, templates, duplicates, shared, dashboard, extraction-templates, workspace-catalog

### Controllers

**Controllers are thin req/res handlers:**

- Parse `req.params`, `req.body`, `req.query`, `req.user`, `req.workspaceId`
- Call exactly one service function
- Return response (json, status codes, etc.)
- **No SQL, no business logic**

### Services

**Services own business logic & validation:**

- Input validation
- Business rules enforcement
- Transaction coordination
- Call one or more repository functions
- Return plain data (not req/res objects)

### Repositories

**Repositories are SQL-only:**

- One parameterized SQL query per function (or a small transaction block)
- Return plain rows/objects
- No req/res, no business logic

### Important Libraries & Utilities

#### `src/lib/async-handler.js`

Wrapper for route handlers; catches async errors and passes to error middleware.

#### `src/lib/jwt.js`

Issue and verify JWT tokens for authentication.

#### `src/lib/cloudinary-storage.js`

Upload/download files to/from Cloudinary; handles overwrite, invalidation, signed URLs.

#### `src/lib/diagram-cache-version.js`

Version diagram URLs with `?v=<ms>` query param using `question_assets.created_at`.

#### `src/middleware/require-role.js`

Middleware guard for role-based access control (`owner`, `admin`, `editor`, `viewer`).

#### `src/middleware/require-auth.js`

Middleware to validate JWT and attach user/workspace to request.

### Error Handling

- Errors in async handlers caught by asyncHandler and passed to Express error middleware
- Error middleware returns `{ error, message, code }` JSON
- HTTP status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)

### Database Connections

- **Connection Pool:** pg client creates pool on module load
- **Per-Query:** Each repository function gets its own connection from pool for the duration of the query
- **Cleanup:** Connections returned to pool automatically

### Important Integrations

#### Google OAuth

- **Configuration:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Flow:** Frontend initiates via `google-auth-library`; backend validates token
- **User Data:** Name, email, picture fetched from Google; stored or linked to existing account

#### Cloudinary

- **Configuration:** `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`
- **Usage:** Diagrams, question assets, user avatars
- **Public IDs:** `paperflow/<workspace>/<mockTest>/diagrams/<questionId>` (stable for cache versioning)
- **Signed URLs:** Generated for secure downloads
- **Invalidation:** Called on replace/crop to bust CDN cache

#### AI Providers (Gemini / OpenAI)

- **Worker-only:** AI calls made from Python worker, not backend
- **Configuration:** `GEMINI_API_KEY` or `OPENAI_API_KEY`, `AI_PROVIDER`
- **Usage:** Enhanced question extraction, duplicate detection, confidence scoring
- **Rate Limiting:** Module-level lock in worker; per-process rate limiting

#### AWS S3 (Optional)

- **Configuration:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- **Fallback:** Can be used instead of Cloudinary for PDF storage
- **Presigned URLs:** Used for secure downloads

---

## 7. Database State

### Engine & Extensions

- **Engine:** PostgreSQL 16
- **Extensions:** pgcrypto (UUID generation), citext (case-insensitive text)
- **Schema Management:** Migrations in `backend/migrations/` (42+ files, numbered sequentially)

### Important Tables & Relationships

#### Users

- `id` (UUID PK)
- `name`, `email` (CITEXT unique), `password_hash`, `avatar_url`
- `is_active`, `last_login_at`, `created_at`, `updated_at`
- OAuth integrations stored via OAuth provider tokens (not in schema shown; likely in future migration)

#### Workspaces

- `id` (UUID PK)
- `name`, `owner_id` (FK users)
- `created_at`, `updated_at`
- **Important:** Workspace isolation is enforced in services/controllers; never join across workspaces without explicit `workspace_id` filter

#### Workspace Members

- `workspace_id` (FK), `user_id` (FK), `role` (ENUM: owner, admin, editor, viewer)
- UNIQUE constraint prevents duplicate memberships
- Roles control access: editor+ can create/edit, admin+ can manage team, owner has full control

#### Clusters

- `id`, `workspace_id`, `created_by`, `name`, `description`
- UNIQUE on (workspace_id, name) — cluster names unique within workspace
- Organizes mock tests hierarchically

#### Mock Tests

- `id`, `workspace_id`, `cluster_id`, `created_by`
- `name`, `description`, `exam_year`, `duration_minutes`, `total_questions`
- `marks_per_correct`, `negative_marks_per_wrong`
- `status` (ENUM: draft, processing, review, published, archived)
- `settings` (JSONB) — marking scheme, section layouts, etc.
- `published_at`, `created_at`, `updated_at`
- **Important:** Status flow is: draft → processing (while job runs) → review (after extraction) → published / archived

#### Questions

- `id`, `mock_test_id`, `workspace_id`
- `stem`, `option_<1-4>`, `explanation`
- `question_type` (ENUM: single, multi)
- `status` (ENUM: needs_review, approved, rejected)
- `confidence`, `topic`, `subtopic`
- `code_language`, `code_content` (for code questions)
- **Important:** Frontend/backend must stay synchronized on question structure; changes to schema require data migration + frontend update

#### Question Assets (Diagrams, Images)

- `id`, `question_id`, `workspace_id`
- `slot_key` (e.g., `stem`, `option_1`)
- `storage_key` (Cloudinary public_id)
- `created_at`, `updated_at`
- **Important:** `created_at` is used for URL versioning (`?v=<ms>`); replace/crop operations must touch this timestamp

#### Processing Jobs

- `id`, `mock_test_id`, `workspace_id`
- `status` (ENUM: queued, running, completed, failed, cancelled)
- `input_config` (JSONB) — `storageKey` (PDF location), `jobType` (upload vs. generate)
- `output_config` (JSONB) — extracted question data
- `error_message`, `progress` (JSON)
- `created_at`, `updated_at`, `started_at`, `completed_at`
- **Important:** Worker claims with `FOR UPDATE SKIP LOCKED`; reprocessing cancels prior active jobs

#### Students & Cohorts

- Cohorts: `id`, `workspace_id`, `name` — collections of students
- Students: `id`, `email`, `cohort_id` — enrolled in cohorts
- **Important:** Students can be anonymous (no user account) for public shared mocks

#### Attempts

- `id`, `mock_test_id`, `student_id`, `user_id` (nullable)
- `status` (ENUM: in_progress, submitted, abandoned)
- `score`, `duration_seconds`, `submitted_at`
- **Important:** Persistence may require new backend endpoints for partial saves

#### Review Queue

- Links questions to review status, confidence, flags
- Tracks approval/rejection workflow

#### Public Catalog

- Published mock tests indexed for discovery
- Publisher subscriptions track catalog interest

### Recent Migrations (42+)

Key migrations address: extraction templates, syllabus/topic tracking, diagram handling, manual crops, code formatting, multi-topic exams, deduplication, publisher subscriptions, student identity, cohorts, duplicate detection, public catalog, question assets, shared question content, etc.

**Current State:** Schema is complex but well-migrated. No obvious rollback issues noted.

### Schema Naming Conventions

- Table names: plural, snake_case (e.g., `processing_jobs`)
- Column names: snake_case
- Enums: lowercase, underscore-separated values
- UUIDs for all primary keys (gen_random_uuid)
- Timestamps: TIMESTAMPTZ, always `created_at` and `updated_at`
- Foreign keys: `<table>_id` (e.g., `user_id`, `workspace_id`)

### Verification Status

- **Schema structure:** Verified from migration files and actual DB inspection
- **Relationships:** Verified; no dangling FKs in current schema
- **Data consistency:** Not fully verified; assume migrations are correct unless issues arise

---

## 8. Worker / Background Processing

### Architecture

- **Language:** Python
- **Concurrency:** ThreadPoolExecutor (default 4 threads per process)
- **Job Claiming:** `FOR UPDATE SKIP LOCKED` on processing_jobs table
- **Rate Limiting:** Module-level lock shared across all threads in one process
- **Deployment:**
  - **Local:** Continuous runner via `worker.py run_forever()`
  - **Production (Render):** HTTP server (`http_server.py`) triggered by external cron-job.org pings every ~1 minute

### Job Processing Pipeline

```
1. claim_next_job()
   → Finds queued job with `FOR UPDATE SKIP LOCKED`
   → Updates status to `running`

2. check_not_cancelled()
   → Verifies job wasn't superseded by reprocess

3. download_job_pdf()
   → Downloads from Cloudinary (via storage_key)
   → Writes to temp file

4. extract_pdf_pages()
   → PyMuPDF (fitz) for PDFs
   → Extracts text and bounding boxes

5. [OCR Fallback]
   → If selectable text < threshold
   → Tesseract OCR on page images
   → Convert scanned PDF to searchable PDF

6. parse_questions()
   → JSON parser
   → Extracts question structure (stem, options, diagrams)

7. generate_questions_from_metadata()
   → AI (Gemini/OpenAI) enhancement
   → Confidence scoring
   → Duplicate flagging

8. upload_diagram()
   → Crop and upload each diagram to Cloudinary
   → Store asset records

9. replace_questions() / replace_slot_content()
   → Write extracted questions to DB
   → Update mock_test.status based on result

10. add_job_event()
    → Timeline entry for job completion
```

### Configuration

**Environment Variables (Names Only, No Secrets):**

- `DATABASE_URL` — PostgreSQL connection string
- `WORKER_POLL_INTERVAL_SECONDS` — Polling frequency (default 5s)
- `WORKER_MAX_JOBS_PER_RUN` — Batch size (default 8 jobs per HTTP /run)
- `WORKER_CONCURRENCY` — Thread count (default 4)
- `AI_PROVIDER` — "gemini" or "openai"
- `GEMINI_API_KEY` — Gemini API key (rate limited)
- `OPENAI_API_KEY` — OpenAI API key
- `AI_MAX_REQUESTS_PER_MINUTE` — Rate limit per process
- `AI_DUPLICATE_REGEN_THRESHOLD` — Confidence threshold for regenerating duplicates
- `OCR_ENABLED` — Boolean; enable Tesseract OCR fallback
- `CLOUDINARY_API_KEY` — For diagram storage
- `AWS_S3_BUCKET` — Optional S3 fallback

### Important Behavior & Known Patterns

#### Cancellation

- Reprocessing a mock test calls `cancelActiveProcessingJobs()` in backend
- Worker checks cancellation at stage boundaries and within AI loops
- Cancelled job stops running and abandons progress

#### Rate Limiting

- Module-level lock in `gemini_provider.py` enforced across all threads
- **Critical:** If multiple worker processes run against same `GEMINI_API_KEY`, each process gets its own rate limiter
  - Combined request rate = `num_processes × AI_MAX_REQUESTS_PER_MINUTE`
  - Risk of exceeding Gemini quota if scaled horizontally without shared limiter

#### Batch Processing

- `MAX_JOBS_PER_RUN` keeps batch sizes modest (default 8)
- Expected to finish within 1–2 minutes even with AI-heavy jobs
- Allows external HTTP pinger (cron-job.org) to keep queue drained in small chunks

#### Error Handling

- Worker catches exceptions with friendly user-facing messages
- Self-describing errors (RuntimeError, FileNotFoundError, ValueError) passed to frontend as-is
- Other errors sanitized to avoid exposing internals to users
- Error stored in `processing_job.error_message`; user sees banner in ProcessingTab

### Storage Integration

- **Upload:** Diagrams and assets uploaded to Cloudinary via `upload_diagram()`
- **Download:** PDFs downloaded from storage location (Cloudinary or S3) via `download_pdf_to_temp_file()`
- **Public IDs:** Stable (`paperflow/<workspace>/<mockTest>/diagrams/<questionId>`) to enable cache versioning

### Current Verified Behavior

- **VERIFIED:** Worker polls and claims jobs correctly
- **VERIFIED:** PDF extraction works with text and OCR fallback
- **VERIFIED:** AI enhancement and confidence scoring working
- **VERIFIED:** Diagram upload to Cloudinary working
- **VERIFIED:** Cancellation stops in-progress jobs
- **PARTIALLY VERIFIED:** Multi-process rate limiting (risk noted but not tested at scale)

### Important Previous Issues

- **BUG:** Worker connection failures (resolved via config; see IMPLEMENTATION_LOG.md)
- **WARNING:** If horizontal scaling is implemented, shared rate limiter needed for Gemini API

---

## 9. Authentication & OAuth

### Authentication Mechanism

- **Primary:** Email + password (bcrypt-hashed)
- **OAuth:** Google Sign-In (optional alternative)
- **Session:** JWT tokens (no server-side sessions)

### Flow: Email/Password Login

```
1. User submits email + password on /auth page
2. Frontend calls POST /api/auth/login
3. Backend:
   - Looks up user by email (case-insensitive)
   - Verifies password with bcrypt.compare()
   - Issues JWT token with user id + workspace info
   - Returns token + user data
4. Frontend:
   - Stores token in localStorage (or memory)
   - Includes `Authorization: Bearer <token>` on all subsequent requests
5. Backend requireAuth middleware:
   - Extracts token from header
   - Validates signature and expiry
   - Attaches decoded user/workspace to req.user, req.workspaceId
   - Rejects if invalid/expired
```

### Flow: Google OAuth

```
1. User clicks "Sign in with Google" on /auth page
2. Frontend:
   - Initiates Google SDK flow (via google-auth-library)
   - User authenticates with Google
   - Receives ID token from Google
3. Frontend calls POST /api/auth/google-signin with ID token
4. Backend:
   - Validates token with Google (google-auth-library)
   - Extracts user info: email, name, picture
   - If user exists by email: link account (create OAuth token record if needed)
   - If user doesn't exist: create new user + workspace
   - Issues JWT token
   - Returns token + user data
5. Frontend handles token as above
```

### Token Management

- **JWT payload:** user id, email, workspace id, role, issued timestamp, expiry timestamp
- **Signature:** Secret key (REDACTED)
- **Expiry:** Typically 7–30 days (verify from code)
- **Refresh:** No refresh token mechanism visible; user re-authenticates on expiry
- **Storage:** Frontend localStorage; exposed to XSS (acceptable trade-off for simplicity)

### Protected Routes

- **Middleware:** `requireAuth()` on all API routes
- **Authorization:** `requireRole(role)` on routes that mutate or require specific access
- **Default Policy:**
  - `GET` (reads) → `requireAuth()` only (any workspace member)
  - `POST`/`PATCH` (create/edit) → `requireRole('editor')`
  - `DELETE` (destructive) → `requireRole('admin')`

### Frontend Auth State

- **Provider:** React Context (likely `src/lib/AuthContext.jsx`)
- **State:** Current user, workspace, token
- **Guards:** `ProtectedRoute` wrapper redirects unauthenticated users to /auth
- **Logout:** Clears localStorage token + React state

### Important Configuration

- `GOOGLE_CLIENT_ID` — Public ID for Google OAuth
- `GOOGLE_CLIENT_SECRET` — Secret for validating Google tokens (REDACTED)
- `JWT_SECRET` — Secret for signing/validating JWT tokens (REDACTED)
- `JWT_EXPIRY_SECONDS` — How long JWT is valid (verify from backend)

### Production vs. Local Differences

- **Google OAuth:** Production has production Google project credentials; local may use localhost redirect URIs or be disabled
- **Deployment URL:** Used in OAuth redirect URIs (e.g., https://paperflow-ki5w.onrender.com vs. http://localhost:3000)
- **Token Storage:** Same mechanism locally and in production (localStorage)

### Current Verified Behavior

- **VERIFIED:** Email/password login works locally
- **VERIFIED:** Google OAuth flow works in production
- **VERIFIED:** JWT validation on protected routes
- **VERIFIED:** Role-based access control enforced
- **PARTIALLY VERIFIED:** OAuth token refresh flow (if any)

---

## 10. Storage

### Current Storage Providers

#### Cloudinary (Primary)

- **Usage:** Diagrams, question assets, user avatars
- **Upload:** Backend `POST /api/questions/:id/diagram` → multer → Cloudinary
- **Access:** Signed URLs for secure downloads; public URLs for cached diagrams
- **Public IDs:** Stable format `paperflow/<workspace>/<mockTest>/diagrams/<questionId>` enables cache versioning
- **Configuration:** `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`
- **Cache Control:** Old behavior sent `Cache-Control: private, max-age=86400` on 302; now omitted to allow versioning
- **Invalidation:** Called on replace/crop operations to bust CDN cache (`invalidate: true`)
- **Overwrite:** Uses `overwrite: true` to replace existing public IDs in place

#### AWS S3 (Optional Fallback)

- **Usage:** Can store PDFs instead of Cloudinary (configurable)
- **Upload:** Via AWS SDK
- **Access:** Presigned URLs for secure downloads
- **Configuration:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`

#### Local File System (Development Only)

- **Usage:** During local development with compose.yaml PostgreSQL
- **Upload:** Files written to `backend/uploads/` directory
- **Access:** Direct file serving (not recommended for production)

### Upload Flow: Question Diagram

```
1. User selects diagram file in QuestionEditor
2. Frontend:
   - Reads file via FileReader API
   - Creates FormData with file
   - POSTs to /api/questions/:id/diagram
3. Backend multer middleware:
   - Stores temp file in `uploads/` (local) or streams to Cloudinary
   - Calls question-assets.controller.uploadDiagram()
4. Controller:
   - Calls question-assets.service.uploadDiagram()
5. Service:
   - Validates file type, size
   - Calls cloudinary-storage.uploadDiagram()
6. Cloudinary storage:
   - Uploads to Cloudinary with public_id: `paperflow/<workspace>/<mockTest>/diagrams/<questionId>`
   - Returns `cloudinary_url`
7. Service:
   - Creates or updates question_assets row
   - Sets `created_at` to now (for versioning)
8. Controller returns asset URL
9. Frontend:
   - Updates local state with new diagramUrl
   - Remounts `<img>` to fetch new URL
   - Displays versioned Cloudinary URL: `{cloudinary_url}?v={created_at_ms}`
```

### Diagram Cache Versioning (Recent Fix)

**Background:** Replaced diagrams still showed old image because browser + Cloudinary CDN cached the URL.

**Fix (2026-08-27):**

- Version every diagram delivery URL using `question_assets.created_at`
- Backend: `/api/questions/:id/diagram` includes `?v=<ms>` query param
- Worker: Uploads to Cloudinary with `/v<ms>/` in public_id
- Replace: Already DELETE+INSERT new row (new `created_at`)
- Crop: Calls `touchAsset()` to bump `created_at`
- Upload: Uses `overwrite: true, invalidate: true` to clear CDN
- Frontend: Remounts `<img>` when `diagramUrl` changes (dependency in useEffect)

**Affected Files:** diagram-cache-version.js (new), cloudinary-storage.js, question-assets.\*.js, worker/storage.py, DiagramUploadControl.jsx, DiagramCropModal.jsx, QuestionPreviewCard.jsx

**Current Status:** VERIFIED in testing; no active issues

### CORS Considerations

- **Frontend URLs:** Vite dev server (localhost:5173) and production build domain
- **Backend CORS:** Configured to allow requests from authorized frontend domains
- **Cloudinary URLs:** Public URLs don't require CORS (CDN serves directly)
- **Signed URLs:** S3 presigned URLs include CORS headers for cross-origin downloads

### Current Verified Behavior

- **VERIFIED:** Cloudinary uploads and serves diagrams
- **VERIFIED:** URL versioning with `?v=<ms>` cache busts correctly
- **VERIFIED:** Diagram replace/crop operations update `created_at`
- **VERIFIED:** Frontend remounts `<img>` on URL changes
- **UNVERIFIED:** S3 fallback (if used in production)

### Important Previous Issues

- **BUG-XXX:** Diagram caching issue — resolved by versioning (see IMPLEMENTATION_LOG.md, 2026-08-27)
- **WARNING:** Ensure cache headers and invalidation remain in place; removing either risks re-introducing stale diagrams

---

## 11. Deployment & Environments

### Local Development Environment

```
Frontend:    Vite dev server (http://localhost:5173)
Backend:     Express on http://localhost:4000 (node --watch)
Database:    PostgreSQL in Docker (docker compose up)
Worker:      Python (python -m worker.worker or python -m worker.http_server)
Storage:     Local file system (backend/uploads/) or Cloudinary
Authentication: Google OAuth (localhost redirect URIs)
```

**Commands:**

- Backend: `npm run dev` (node --watch)
- Frontend: `npm run dev` (Vite)
- Worker (continuous): `npm run worker` (python -m worker.worker)
- Worker (http): `npm run worker:http` (python -m worker.http_server) + external HTTP pinger
- Database migration: `npm run db:migrate`
- Database setup: `docker compose up`

### Production Environment

```
Frontend:    Vite build deployed to static host (Render)
Backend:     Node.js Express on Render Web Service
Database:    PostgreSQL managed service (Render, AWS RDS, etc.)
Worker:      Python http_server.py on Render Web Service (separate dyno)
             Triggered by external cron-job.org pinger (~1 minute interval)
Storage:     Cloudinary (primary), S3 (optional fallback)
Authentication: Google OAuth with production redirect URI
```

**Deployment URLs:**

- **Live:** https://paperflow-ki5w.onrender.com/
- **API:** https://paperflow-api.onrender.com/ (or same domain with /api prefix)
- **Database:** Managed PostgreSQL instance (specific URL REDACTED)

### Worker Deployment Details

#### Local (Continuous Polling)

```bash
npm run worker
# Continuously polls database every WORKER_POLL_INTERVAL_SECONDS
# Processes MAX_JOBS_PER_RUN per iteration
# Ideal for development and always-on deployments
```

#### Production (Render Web Service + Cron Pinger)

```bash
npm run worker:http
# Starts HTTP server on PORT (default 4000, or WORKER_PORT if set)
# Listens on POST /run
# Each ping processes MAX_JOBS_PER_RUN jobs
# External pinger (cron-job.org free tier) hits every ~60 seconds
# Prevents multiple /run calls from stacking via _run_lock
```

**Rationale for HTTP mode on production:**

- Render free tier Web Services restart periodically; continuous polling would waste cycles on idle restarts
- HTTP server can be triggered on-demand by external cron
- Batch-based processing keeps costs low

### Environment Variables Summary

**Frontend (via Vite .env):**

- `VITE_API_BASE_URL` — Backend API base (e.g., https://paperflow-api.onrender.com)
- (Others as needed for frontend configuration)

**Backend (via .env at root):**

- `PORT` — Server port (default 4000)
- `DATABASE_URL` — PostgreSQL connection string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `JWT_SECRET` — JWT signing key (REDACTED)
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME` — Storage
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` — Optional S3
- `GEMINI_API_KEY` or `OPENAI_API_KEY` — AI provider
- `AI_PROVIDER` — "gemini" or "openai"
- `AI_MAX_REQUESTS_PER_MINUTE` — Rate limit
- Others for worker, CORS, timeouts, etc.

### Deployment Checklist (Verification)

- [ ] Frontend build passes (`npm run build`)
- [ ] Backend starts without errors (`npm start`)
- [ ] Database connection verified
- [ ] Google OAuth credentials configured
- [ ] Cloudinary credentials verified
- [ ] AI provider (Gemini/OpenAI) API key set
- [ ] Environment variables populated (no defaults for secrets)
- [ ] Worker can connect to database
- [ ] External pinger configured (if using HTTP worker mode)

### Current Verified Behavior

- **VERIFIED:** Local development environment works end-to-end
- **VERIFIED:** Production deployment accessible at live URL
- **VERIFIED:** Database migrations run on deployment
- **VERIFIED:** Worker processes jobs in production
- **PARTIALLY VERIFIED:** Multi-process scaling (rate limiter risk noted)

---

## 12. Environment Configuration

### Configuration Files

- **Backend:** `.env` at `backend/` root (loads via dotenv)
- **Frontend:** `.env.local`, `.env.production` (Vite loads via VITE\_ prefix)
- **Worker:** Reads from `backend/.env` (inherits backend configuration)

### Important Configuration Names & Purposes (No Secrets)

| Variable                       | Layer           | Purpose                      | Default                     | Risk                                 |
| ------------------------------ | --------------- | ---------------------------- | --------------------------- | ------------------------------------ |
| `PORT`                         | Backend         | Server listen port           | 4000                        | None                                 |
| `DATABASE_URL`                 | Backend, Worker | PostgreSQL connection        | Required                    | Connection failure if missing        |
| `GOOGLE_CLIENT_ID`             | Backend         | OAuth client ID              | Required                    | Logins fail if missing               |
| `GOOGLE_CLIENT_SECRET`         | Backend         | OAuth validation secret      | Required (REDACTED)         | Security risk if exposed             |
| `JWT_SECRET`                   | Backend         | JWT token signing key        | Required (REDACTED)         | Security risk if exposed             |
| `JWT_EXPIRY_SECONDS`           | Backend         | Token expiry duration        | (Verify from code)          | Tokens longer than needed if high    |
| `CLOUDINARY_API_KEY`           | Backend         | Cloudinary authentication    | Required                    | Uploads fail if missing              |
| `CLOUDINARY_API_SECRET`        | Backend         | Cloudinary signing           | Required (REDACTED)         | Security risk if exposed             |
| `CLOUDINARY_CLOUD_NAME`        | Backend         | Cloudinary account           | Required                    | Wrong domain if incorrect            |
| `AWS_ACCESS_KEY_ID`            | Backend         | S3 authentication (optional) | (Optional)                  | Unused if S3 not enabled             |
| `AWS_SECRET_ACCESS_KEY`        | Backend         | S3 signing (optional)        | (Optional) (REDACTED)       | Unused if S3 not enabled             |
| `AWS_REGION`                   | Backend         | S3 region                    | (Optional)                  | Wrong endpoint if incorrect          |
| `AWS_S3_BUCKET`                | Backend         | S3 bucket name               | (Optional)                  | Uploads to wrong bucket if incorrect |
| `AI_PROVIDER`                  | Worker          | "gemini" or "openai"         | (Verify from code)          | Wrong AI used if incorrect           |
| `GEMINI_API_KEY`               | Worker          | Gemini API authentication    | Required if provider=gemini | Requests fail if missing (REDACTED)  |
| `OPENAI_API_KEY`               | Worker          | OpenAI API authentication    | Required if provider=openai | Requests fail if missing (REDACTED)  |
| `AI_MAX_REQUESTS_PER_MINUTE`   | Worker          | Rate limit                   | (Verify from code)          | Quota exceeded if too high           |
| `WORKER_POLL_INTERVAL_SECONDS` | Worker          | Poll frequency               | 5                           | Queue stalls if too high             |
| `WORKER_MAX_JOBS_PER_RUN`      | Worker          | Batch size                   | 8                           | Backlog builds if too low            |
| `WORKER_CONCURRENCY`           | Worker          | Thread count                 | 4                           | Resource exhaustion if too high      |
| `OCR_ENABLED`                  | Worker          | Enable Tesseract OCR         | (Verify from code)          | Scanned PDFs fail if disabled        |
| `VITE_API_BASE_URL`            | Frontend        | Backend API endpoint         | (Verify from code)          | API calls fail to wrong domain       |

### Secrets (Never in CURRENT_STATE.md)

Use `[REDACTED]` for:

- Database passwords
- API keys (Google, Gemini, OpenAI, Cloudinary, AWS)
- JWT secrets
- OAuth secrets
- S3 secrets

### Configuration Risks & Notes

1. **Multi-process Worker:** Each process gets its own rate limiter for Gemini/OpenAI. Scaling horizontally requires shared limiter (Redis, etc.) to avoid quota exceed.
2. **Token Expiry:** Very long expiries increase XSS risk; very short expiries frustrate users. Verify default and document in DECISION_LOG.
3. **Cloudinary Cache:** Cache-Control headers and invalidation are critical (see BUG-XXX). Never remove without understanding diagram versioning.
4. **Google OAuth:** Redirect URIs must match deployment domain. Local development may require separate config.

---

## 13. Current Verified Behavior

### Frontend

| Component                    | Status             | Notes                                           |
| ---------------------------- | ------------------ | ----------------------------------------------- |
| React Router navigation      | VERIFIED           | Pages load, route transitions work              |
| TanStack Query data fetching | VERIFIED           | API responses cached correctly                  |
| Authentication flow          | VERIFIED           | Login/logout, token handling                    |
| Question editor              | VERIFIED           | Edit, save, diagram upload works                |
| Design system primitives     | PARTIALLY VERIFIED | Foundation complete; page migration in progress |
| Diagram cache versioning     | VERIFIED           | Replaced diagrams update correctly              |
| Dark/light theme toggle      | VERIFIED           | Theme persists across sessions                  |

### Backend

| Component               | Status   | Notes                                    |
| ----------------------- | -------- | ---------------------------------------- |
| Express server startup  | VERIFIED | Listens on configured port               |
| Database connections    | VERIFIED | Pool management, query execution         |
| Protected routes        | VERIFIED | Auth middleware enforces JWT validation  |
| Role-based access       | VERIFIED | requireRole guards enforce policies      |
| PDF upload flow         | VERIFIED | Multipart form handling, storage routing |
| Google OAuth validation | VERIFIED | Token signature validation, user linking |
| Cloudinary integration  | VERIFIED | Upload, download, signed URLs            |
| Error handling          | VERIFIED | Async errors caught, friendly messages   |

### Worker

| Component                 | Status             | Notes                                                |
| ------------------------- | ------------------ | ---------------------------------------------------- |
| Job claiming              | VERIFIED           | FOR UPDATE SKIP LOCKED prevents race conditions      |
| PDF extraction            | VERIFIED           | PyMuPDF text extraction works                        |
| OCR fallback              | VERIFIED           | Tesseract converts scanned PDFs                      |
| Question parsing          | VERIFIED           | JSON structure extracted correctly                   |
| AI enhancement            | VERIFIED           | Gemini/OpenAI API calls work, confidence scoring     |
| Diagram cropping & upload | VERIFIED           | Bounding boxes cropped, assets stored                |
| Database writes           | VERIFIED           | Questions inserted/updated correctly                 |
| Cancellation              | VERIFIED           | Reprocessing stops prior job                         |
| HTTP server mode          | PARTIALLY VERIFIED | Works in production; rate limiting untested at scale |

### Database

| Component               | Status   | Notes                                           |
| ----------------------- | -------- | ----------------------------------------------- |
| Schema creation         | VERIFIED | All migrations run successfully                 |
| UUID generation         | VERIFIED | Primary keys generated correctly                |
| Foreign key constraints | VERIFIED | Referential integrity enforced                  |
| Role-based enum         | VERIFIED | Member roles validated                          |
| Status enums            | VERIFIED | Processing/question/attempt states correct      |
| Unique constraints      | VERIFIED | Cluster/mock test names unique within workspace |

### Integrations

| Integration                | Status     | Notes                                                  |
| -------------------------- | ---------- | ------------------------------------------------------ |
| Cloudinary upload/download | VERIFIED   | Diagrams serve, cache versioning works                 |
| Cloudinary invalidation    | VERIFIED   | CDN cache cleared on replace/crop                      |
| Google OAuth               | VERIFIED   | Sign-in flow works; token validation correct           |
| Gemini API                 | VERIFIED   | Enhancement, confidence, duplicate detection           |
| OpenAI API                 | UNVERIFIED | Configured but may not be tested in current deployment |
| AWS S3                     | UNVERIFIED | Code exists but Cloudinary is primary                  |

### End-to-End Flows

| Flow                                   | Status             | Notes                                                          |
| -------------------------------------- | ------------------ | -------------------------------------------------------------- |
| User signup → workspace creation       | VERIFIED           | Email/password and OAuth both work                             |
| PDF upload → extraction → review       | VERIFIED           | Processing timeline, status updates, question extraction       |
| Question edit → diagram replace → save | VERIFIED           | Diagram versioning, remount, DB update                         |
| Publish mock test → share link         | PARTIALLY VERIFIED | Publishing works; full student attempt flow needs verification |
| Student attempts mock → view results   | PARTIALLY VERIFIED | Submission works; analytics/leaderboard completion pending     |

---

## 14. Active Issues

### Current / High Priority

_None recorded as of 2026-08-31._

### Known Limitations

1. **Frontend Architecture:** Pages are still too monolithic; refactor in progress (see Refactor_Blueprint.md)
2. **Worker Rate Limiting:** Module-level limiter only per-process; horizontal scaling risks quota exceed
3. **Student Attempt Persistence:** May need additional backend endpoints for partial saves (see DECISION_LOG)
4. **Design System Migration:** Pages gradually migrating to use new design-system primitives; incomplete

### Areas Requiring Investigation Before Changes

1. **Diagram Versioning:** Do not modify without reviewing diagram cache fix (see IMPLEMENTATION_LOG, 2026-08-27)
2. **Worker Concurrency:** Do not increase WORKER_CONCURRENCY without understanding rate limiter design
3. **Database Migrations:** Do not modify existing migrations; only add new ones
4. **OAuth Flow:** Do not change Google callback handling without testing both local and production URIs

---

## 15. Important Historical Warnings

### Warning 1: Diagram Caching (2026-08-27)

**Issue:** After replacing or cropping a diagram, the old image still displayed in the editor.

**Cause:** Browser + Cloudinary CDN cached diagram URLs; `Cache-Control: private, max-age=86400` prevented immediate updates.

**Resolution:** Implemented URL versioning with `?v=<created_at_ms>` and `invalidate: true` on Cloudinary uploads.

**Critical Action:**

- Do NOT remove cache versioning from diagram URLs.
- Do NOT remove `invalidate: true` from Cloudinary upload config.
- Do NOT change `question_assets.created_at` behavior.
- Frontend MUST remount `<img>` when `diagramUrl` changes.

**Related:** IMPLEMENTATION_LOG.md (2026-08-27)

### Warning 2: Worker Connection Failures

**Previous Issue:** Worker couldn't connect to database in certain deployments.

**Resolution:** Configuration and connection pool management fixed.

**Current Status:** No active incidents; configuration stable.

**Related:** See IMPLEMENTATION_LOG.md for details; do not revert configuration changes.

### Warning 3: OAuth Redirect URIs

**Potential Issue:** Google OAuth redirect URIs must match deployment domain.

**Risk:** If URIs are hardcoded or misconfigured, login fails in new deployments.

**Action:** Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set correctly for each environment.

**Related:** Check production vs. local OAuth configuration in comments

---

## 16. AI Conflict Zones

### Zone 1: Question Structure (Frontend ↔ Backend ↔ Database)

**Components:**

- Frontend editor fields: `stem`, `options[1-4]`, `explanation`, `code_content`, `code_language`
- Backend question schema columns
- Database columns in `questions` table

**Current Behavior:**

- Stem: Rich text (TipTap) or code
- Options: Up to 4 slots (single) or multi-correct with per-slot diagrams
- Explanation: Rich text
- Code: Language + syntax-highlighted content stored separately

**Potential Conflict:**

- Adding a new question field requires coordinated changes: frontend form → backend validation → database migration → repository queries

**What AI Must Check Before Changing:**

- [ ] Frontend form includes new field with proper type
- [ ] Backend controller validates and passes to service
- [ ] Service stores in correct database column
- [ ] Repository query includes new column in INSERT/UPDATE
- [ ] Migration adds column with correct type and constraints
- [ ] No orphaned fields (UI but not stored, or stored but not displayed)

**Related Entries:** ENGINEERING_STANDARDS.md (Rule 4: Keep routes thin), DESIGN_DECISIONS.md

---

### Zone 2: Diagram Storage & Cache Versioning (Frontend ↔ Backend ↔ Cloudinary)

**Components:**

- Frontend: `<img>` rendering, cache busting via `?v=` param, remount on URL change
- Backend: `question_assets.created_at` bump on replace/crop, Cloudinary upload config
- Cloudinary: Public IDs, invalidation, CDN cache control

**Current Behavior:**

- Diagrams stored with stable public IDs: `paperflow/<workspace>/<mockTest>/diagrams/<questionId>`
- Replace/crop operations DELETE + INSERT new asset row (new `created_at`)
- URLs versioned: `/api/questions/:id/diagram?v=<ms>` and Cloudinary `/v<ms>/`
- Cloudinary upload uses `overwrite: true, invalidate: true`
- Frontend remounts `<img>` when URL changes (dependency tracking)

**Potential Conflict:**

- Removing versioning → old diagrams cache indefinitely
- Removing invalidation → CDN serves stale images
- Frontend not remounting → local state updates but UI doesn't
- Changing public_id format → versioning scheme breaks

**What AI Must Check Before Changing:**

- [ ] Do NOT remove `?v=` from diagram URLs
- [ ] Do NOT remove `invalidate: true` from Cloudinary config
- [ ] Do NOT change public_id format without updating versioning logic
- [ ] Do NOT skip remounting `<img>` when diagramUrl changes
- [ ] Frontend/backend/storage changes must be coordinated

**Related Entries:** IMPLEMENTATION_LOG.md (2026-08-27, BUG-XXX), Important Historical Warnings #1

---

### Zone 3: Processing Job Status (Frontend ↔ Backend ↔ Worker ↔ Database)

**Components:**

- Database enum: `queued` → `running` → `completed` / `failed` / `cancelled`
- Frontend UI: Processing timeline, status badges, error banners
- Backend: Job update queries, cancellation logic
- Worker: Job claiming, status transitions, error handling

**Current Behavior:**

- Job lifecycle: create (queued) → claim (running) → complete/fail → update DB → frontend polls and updates
- Cancellation: Reprocessing calls `cancelActiveProcessingJobs()`, worker checks flag at boundaries
- Error handling: RuntimeError/FileNotFoundError messages user-friendly; others sanitized

**Potential Conflict:**

- Adding a new status enum requires migrations + frontend/backend/worker updates
- Changing error message format → frontend parsing breaks
- Not checking cancellation flag → reprocessing job doesn't actually stop

**What AI Must Check Before Changing:**

- [ ] Database enum includes new status (migration required)
- [ ] Backend queries reference correct enum values
- [ ] Frontend components render all status values
- [ ] Worker transitions follow allowed state diagram
- [ ] Error messages sanitized before storing in DB
- [ ] Cancellation logic includes check_not_cancelled() at all stage boundaries

**Related Entries:** BACKEND_ARCHITECTURE_GUIDE.md, Zone 8 (Worker)

---

### Zone 4: Workspace Isolation (Backend ↔ Database Queries)

**Components:**

- Database: Every table with `workspace_id` column
- Backend queries: Must filter by `workspace_id` to prevent cross-workspace data leaks
- Controllers: Attach `req.workspaceId` from auth middleware
- Services: Receive workspace_id as parameter
- Repositories: Include workspace_id in WHERE clauses

**Current Behavior:**

- Middleware `requireAuth()` attaches `req.workspaceId` from JWT token
- Every service function receives `workspaceId` parameter
- Every repository query includes `WHERE workspace_id = $X` to filter results

**Potential Conflict:**

- Forgetting workspace_id filter → user sees data from other workspaces
- Joining tables without workspace_id → cross-workspace leaks
- Caching without workspace_id key → stale data across workspaces

**What AI Must Check Before Changing:**

- [ ] Every query includes `WHERE workspace_id = $X`
- [ ] No joins across workspaces without explicit same-workspace check
- [ ] Services receive and pass `workspaceId` to repositories
- [ ] Controllers pass `req.workspaceId` to services
- [ ] Frontend TanStack Query keys include workspace identifier

**Related Entries:** BACKEND_ARCHITECTURE_GUIDE.md, 4-layer architecture section

---

### Zone 5: Authentication & Authorization (Frontend ↔ Backend Middleware)

**Components:**

- Frontend: Token storage (localStorage), inclusion in headers, logout
- Backend middleware: Token validation, user/workspace attachment, role checks
- Routes: `requireAuth()`, `requireRole(role)` guards

**Current Behavior:**

- Frontend stores JWT in localStorage after login
- Frontend includes `Authorization: Bearer <token>` on all requests
- `requireAuth()` middleware validates JWT, extracts user/workspace, rejects if invalid
- `requireRole(role)` middleware checks user's role in workspace, rejects if insufficient

**Potential Conflict:**

- Changing JWT structure → validation fails
- Not calling requireAuth() on protected route → anyone can access
- Forgetting requireRole() on mutating endpoints → viewers can edit
- XSS stealing localStorage token → attacker has access until expiry

**What AI Must Check Before Changing:**

- [ ] Protected routes have `requireAuth()` middleware
- [ ] Mutating routes have `requireRole('editor')` or higher
- [ ] Role checks match authorization intent (owner/admin/editor/viewer)
- [ ] Token format changes coordinated across frontend + backend
- [ ] No authentication checks in services (only in middleware)

**Related Entries:** ENGINEERING_STANDARDS.md, 4-layer architecture section

---

### Zone 6: Question Extraction & AI Enhancement (Worker ↔ Database ↔ Frontend)

**Components:**

- Worker: PDF parsing, AI calls, question structure generation
- Database: `questions` table structure, confidence/status columns
- Frontend: Question editor form, confidence display, review queue

**Current Behavior:**

- Worker extracts question structure from PDF (stem, options)
- AI enhancement adds/improves fields (stem clarity, option clarity, confidence)
- Confidence: 0.0–1.0 score stored in `questions.confidence` column
- Status: `needs_review` initially; user approves/rejects
- Frontend renders review queue sorted by confidence (lowest first)

**Potential Conflict:**

- Worker generating unexpected question structure → frontend form errors
- AI confidence scoring changed → review queue sort order unpredictable
- Database column removed → worker INSERT fails
- Frontend filtering by confidence without handling null values

**What AI Must Check Before Changing:**

- [ ] Worker output matches expected question schema (stem, options, diagrams, etc.)
- [ ] AI confidence is always 0.0–1.0 or NULL
- [ ] Database column types match worker output types
- [ ] Frontend handles missing confidence (display "unrated" or skip)
- [ ] Review queue handles mixed confidence values gracefully

**Related Entries:** Worker section (Zone 8), Services section (Backend)

---

### Zone 7: Design System & CSS (Frontend Pages ↔ Components)

**Components:**

- Global styles: `frontend/src/index.css` (single source of truth)
- Component styles: Tailwind classes in component JSX
- Design-system primitives: `frontend/src/components/design-system/`
- Legacy compatibility: Teal-aliased violet class names

**Current Behavior:**

- Design system foundation (Milestone 1) complete with Academic Teal token set
- Pages still using legacy violet classes (gradually migrating)
- New primitives (StatusBadge, EmptyState, etc.) available; not yet used everywhere
- Geist typography loaded from Google Fonts

**Potential Conflict:**

- Adding new components without design-system → inconsistent visual language
- Hardcoding colors in components → deviates from token set
- Removing legacy violet aliases too early → pages break during migration
- Adding custom Tailwind classes → design drift

**What AI Must Check Before Changing:**

- [ ] New components use design-system primitives (StatusBadge, etc.)
- [ ] Color values come from token set (via CSS variables)
- [ ] Typography uses Geist Sans / Geist Mono
- [ ] Do NOT remove legacy violet class aliases yet
- [ ] Changes align with Refactor_Blueprint milestone order

**Related Entries:** IMPLEMENTATION_LOG.md (Milestone 1, 2026-07-23), DESIGN_DECISIONS.md, Refactor_Blueprint.md

---

### Zone 8: Worker Configuration & Rate Limiting (Worker ↔ Backend Deployment)

**Components:**

- Worker environment: WORKER_CONCURRENCY, WORKER_POLL_INTERVAL_SECONDS, WORKER_MAX_JOBS_PER_RUN
- Rate limiter: Module-level lock in `gemini_provider.py`
- Gemini/OpenAI quotas: AI_MAX_REQUESTS_PER_MINUTE per process
- Deployment mode: Continuous polling (local) vs. HTTP server + cron pinger (production)

**Current Behavior:**

- Default concurrency: 4 threads per process
- Default poll interval: 5 seconds
- Default batch size: 8 jobs per run
- Rate limiter: Shared across threads in one process only
- Each worker process gets its own rate limiter instance

**Potential Conflict:**

- Horizontal scaling without shared rate limiter → combined quota exceed
- Increasing concurrency too high → thread pool exhaustion, resource stalls
- Reducing batch size → queue backlog builds
- Changing deployment mode (continuous → HTTP) without updating external pinger

**What AI Must Check Before Changing:**

- [ ] Rate limiter implementation reviewed if scaling horizontally
- [ ] Worker concurrency tuned for target hardware resources
- [ ] Batch size appropriate for expected job complexity
- [ ] If changing to/from HTTP mode, external pinger config updated
- [ ] No hardcoded assumptions about single-process deployment

**Related Entries:** Worker section (Zone 8), Backend State (Worker), Configuration section

---

## 17. Important Technical Decisions

### DEC-001: Strict 4-Layer Architecture (Routes → Controllers → Services → Repositories)

**Decision:** Backend code organized into four strict layers; each layer has single responsibility, no business logic in routes, no SQL in services.

**Rationale:** Testability, clarity, separation of concerns, reduces bugs.

**Important:** Do not put business logic in routes, SQL in services, or req/res handling in repositories.

**Related:** BACKEND_ARCHITECTURE_GUIDE.md (full details)

### DEC-002: Feature-First Frontend Architecture (Target)

**Decision:** Frontend should organize around product features, not pages; thin route pages, extracted components/hooks, design-system primitives.

**Current Status:** Planned; partially underway.

**Implementation Order:** Design system (✓ complete) → shared hooks/services → core pages → sub-features.

**Related:** ENGINEERING_STANDARDS.md, Refactor_Blueprint.md

### DEC-003: Academic Teal Design System (2026-07-23)

**Decision:** Replaced violet visual language with Academic Teal token set; unified typography (Geist), motion, semantic colors.

**Current Status:** Foundation complete; page migration gradual.

**Important:** Do not introduce new colors outside token set; legacy violet aliases remain for migration.

**Related:** IMPLEMENTATION_LOG.md (Milestone 1), DESIGN_DECISIONS.md

### DEC-004: Diagram Cache Versioning (2026-08-27)

**Decision:** Diagram URLs versioned with `?v=<created_at_ms>`; Cloudinary public IDs stable; replace/crop operations bump timestamp.

**Rationale:** Allows cache busting without URL scheme changes; browser + CDN caches immediately stale.

**Important:** Do NOT remove versioning logic; do NOT skip frontend remount.

**Related:** IMPLEMENTATION_LOG.md (2026-08-27)

### DEC-005: JWT-Based Stateless Authentication

**Decision:** No server-side sessions; JWT tokens issued on login, validated on every protected request.

**Rationale:** Simplicity, horizontal scalability, standard practice.

**Trade-off:** XSS risk (token in localStorage); acceptable for this project.

**Related:** Authentication section (Zone 9)

### DEC-006: Worker as External Job Processor (Not Embedded in Backend)

**Decision:** PDF extraction, OCR, AI work done by separate Python worker, not Node.js backend; job queue in database.

**Rationale:** Different runtime (Python for AI libraries), independent scaling, no blocking the API.

**Important:** Worker must handle cancellation, race conditions (FOR UPDATE SKIP LOCKED), and rate limiting.

**Related:** Worker section, Processing Jobs section

### DEC-007: Workspace Isolation as Architectural Requirement

**Decision:** Every query filtered by `workspace_id`; no cross-workspace joins; isolation enforced in database constraints.

**Rationale:** Multi-tenant safety, data privacy, security.

**Important:** No shortcuts; workspace_id filter is non-negotiable.

**Related:** Zone 4 (Workspace Isolation), Schema section

---

## 18. Recently Changed Areas

---

## 19. Areas Requiring Extra Caution

### ⚠ Worker / Background Processing

**Why:** Concurrency, rate limiting, database race conditions, AI quota management. Easy to introduce deadlocks or quota overages.

**Before changing:** Read worker section (Zone 8), config section, understand job claiming flow (FOR UPDATE SKIP LOCKED), rate limiter scope.

### ⚠ Diagram Storage & Versioning

**Why:** Complex cache-busting logic across frontend, backend, and Cloudinary. Removing versioning reintroduces stale-image bug.

**Before changing:** Review historical warning #1, IMPLEMENTATION_LOG.md (2026-08-27), diagram-cache-version.js.

### ⚠ Workspace Isolation

**Why:** Security-critical. Forgetting workspace_id filter → data leaks between workspaces.

**Before changing:** Audit every query; verify WHERE clauses; test cross-workspace access prevention.

### ⚠ Authentication & OAuth

**Why:** Security-critical. Wrong token validation, missing role checks, or misconfigured OAuth → unauthorized access.

**Before changing:** Understand JWT structure, OAuth flow, role-based policies; test both local and production scenarios.

### ⚠ Database Schema & Migrations

**Why:** Permanent changes; rollback difficult. Forgetting constraint, wrong column type, or missing migration → data corruption.

**Before changing:** Test migration locally; verify constraints; consider rollback scenario.

### ⚠ Frontend Pages (During Refactor)

**Why:** Monolithic pages being extracted; architecture in flux. Easy to create duplicate logic or incomplete extractions.

**Before changing:** Check Refactor_Blueprint.md for implementation order; follow ENGINEERING_STANDARDS.md rules.

### ⚠ Design System Adoption

**Why:** Gradual migration from violet to teal. Inconsistent adoption → visual drift; removed aliases → page breakage.

**Before changing:** Do NOT remove legacy violet aliases yet; use design-system primitives for all new code; follow Refactor_Blueprint order.

---

## 20. Current System Summary

### What Is the Current Architecture?

```
React SPA (Vite)
  ↓ REST API
Express 5 Backend (4-layer: routes/controllers/services/repositories)
  ↓
PostgreSQL 16 (42+ migrations, multi-tenant isolation)
  ↓ Job queue
Python Worker (ThreadPoolExecutor, AI enhancement, diagram extraction)
  ↓ Async file operations
Cloudinary (primary storage)
AWS S3 (optional fallback)
```

### What Is Currently Verified?

- ✓ Local development environment works end-to-end
- ✓ PDF extraction pipeline (text + OCR fallback)
- ✓ AI enhancement and confidence scoring
- ✓ Diagram versioning and cache busting (fixed 2026-08-27)
- ✓ Google OAuth and JWT-based auth
- ✓ Database migrations and schema
- ✓ Frontend pages render; design system foundation in place
- ✓ Worker job claiming and concurrency safety (local)
- ✓ Cloudinary upload/download and invalidation
- ⚠ Production deployment (accessible, but some features partially tested)
- ⚠ Student attempt persistence and analytics (incomplete)
- ⚠ Horizontal worker scaling (code exists; rate limiter risk noted)

### What Is Currently Broken?

- ❌ No active critical issues as of 2026-08-31
- ⚠ Frontend architecture drift (pages too monolithic; refactor in progress)
- ⚠ Design system not fully adopted (migration gradual)

### What Is Currently Risky?

1. **Worker Horizontal Scaling:** Each process gets own rate limiter; quota exceed risk if scaled without shared limiter (Redis, etc.)
2. **Frontend Refactor:** In-progress architecture changes; incremental migration needed to avoid breakage
3. **Diagram Versioning:** Cache logic complex; removing any piece reintroduces bug
4. **OAuth Configuration:** Redirect URIs environment-specific; misconfiguration → login fails in new deployments
5. **Workspace Isolation:** Every query must filter by workspace_id; one forgotten filter → data leak

### Which Areas Should an AI Investigate Before Changing?

1. **Before modifying any worker code:** Review worker section, config section, rate limiter design
2. **Before touching storage/diagrams:** Read diagram cache warning, IMPLEMENTATION_LOG (2026-08-27)
3. **Before adding database fields:** Check all 4 layers (routes → controllers → services → repositories); coordinate migrations
4. **Before refactoring pages:** Consult Refactor_Blueprint.md; follow ENGINEERING_STANDARDS.md
5. **Before adding OAuth/auth:** Understand JWT structure, role-based policies, local vs. production config
6. **Before modifying database queries:** Verify workspace_id filters are present; test cross-workspace prevention
7. **Before adopting/changing design-system:** Do NOT remove legacy aliases yet; follow foundation → pages order

---

## How to Update This File

1. **After major implementation:** Update relevant section (e.g., "Worker State") and note `Related: IMP-XXX` reference
2. **After resolving a bug:** Note in "Active Issues" → "Resolved Issues" section; reference `BUG-XXX` in KNOWN_ISSUES.md
3. **After architectural decision:** Add entry to "Important Technical Decisions" section with rationale
4. **After discovering a risk:** Add to "AI Conflict Zones" with concrete checks
5. **Quarterly review:** Audit for outdated information; correct discrepancies
6. **During onboarding:** New AIs should read this file first; note gaps and report them

---

**End of CURRENT_STATE.md**
