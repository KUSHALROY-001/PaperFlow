# PaperFlow

**Turn messy exam PDFs into structured, editable mock tests — with AI.**

PaperFlow is an end-to-end platform for educators, coaching institutes, and exam-prep teams. Upload a scanned or digital question paper, let the pipeline extract questions (including diagrams and multi-image options), review and edit them, then publish mock tests for students.

**Live demo:** [https://paperflow-ki5w.onrender.com/](https://paperflow-ki5w.onrender.com/)

**Repository:** [https://github.com/KUSHALROY-001/PaperFlow](https://github.com/KUSHALROY-001/PaperFlow)

---

## Table of contents

- [Why PaperFlow](#why-paperflow)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database schema](#database-schema)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Running the worker](#running-the-worker)
- [Key product flows](#key-product-flows)
- [API surface (overview)](#api-surface-overview)
- [Diagrams & multi-slot images](#diagrams--multi-slot-images)
- [Development notes](#development-notes)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Why PaperFlow

Building a usable mock test from a real exam PDF is still mostly manual work:

- Scanned pages, mixed subjects, dense layouts
- Circuits, graphs, and chemical structures that plain OCR destroys
- Option-level images and multi-part questions
- Hours of copy-paste before a single student can attempt the paper

PaperFlow automates the heavy lift (extract → structure → attach diagrams), then gives humans a proper editor to fix what the model got wrong — crop, replace, reorder, publish.

---

## Features

### Extraction & processing

- **PDF upload** with job queue (`processing_jobs`) and live timeline
- **Selectable-text** extraction via PyMuPDF; **OCR fallback** via Tesseract when needed
- **Vision / AI cleanup** (Gemini or OpenAI) for strict JSON question output
- **Exam templates** (e.g. JEE Advanced section layouts, marking schemes)
- **Diagram detection** with bounding-box crops, multi-slot images (`![[img:slot_key]]`)
- Oversized crop padding (≈ **2×** detected box) so clipped figures are recoverable; users tighten with the crop tool

### Authoring

- Full **question editor** (stem, options, explanation)
- **KaTeX / MathLive** for formulas; TipTap rich text for structured content
- **Per-slot diagram controls**: upload, replace, crop, clear (stem _and_ options)
- Topic / subtopic tagging, single & multi-correct types
- **Review queue**, confidence signals, approve / flag workflows
- **Question bank**, duplicates detection, cross-test reuse

### Delivery & collaboration

- **Clusters** of mock tests; workspace roles (`viewer` / `editor` / `admin`)
- **Team invites**, student cohorts, attempt tracking & results
- **Public catalog** and shareable mock links
- Auth: email/password + **Google sign-in** (profile avatars supported)
- Dark / light theme

---

## Tech stack

| Layer           | Technology                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend        | React 19, Vite 8, Tailwind CSS 4, React Router 7, TanStack Query, TipTap, KaTeX, MathLive, Framer Motion |
| API             | Node.js 22 (ESM), Express 5, PostgreSQL (`pg`), JWT + Google Auth, Multer, Sharp, Puppeteer (PDF export) |
| Worker          | Python 3, PyMuPDF, Pillow, Tesseract, psycopg 3, Cloudinary / B2 SDKs                                    |
| Storage         | PostgreSQL 16, Cloudinary (diagrams), Backblaze B2 or S3-compatible (source PDFs)                        |
| Infra (typical) | Docker Compose for local Postgres; Render (or similar) for hosted API + static frontend                  |

---

## Architecture

```
┌─────────────┐     REST/JWT      ┌──────────────────┐
│  React SPA  │ ───────────────►  │  Express API     │
│  (Vite)     │                   │  routes → ctrl   │
└─────────────┘                   │  → service → repo│
                                  └────────┬─────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
              PostgreSQL 16          Cloudinary              B2 / S3
              (questions, jobs,      (diagram PNGs)         (uploaded PDFs)
               attempts, teams)
                                           ▲
                                  ┌────────┴────────┐
                                  │  Python worker  │
                                  │  claim job →    │
                                  │  extract/OCR/AI │
                                  │  → insert Qs    │
                                  └─────────────────┘
```

**Backend layering** (enforced in-repo):

```
Route → Controller → Service → Repository
```

- Routes: path + middleware only
- Controllers: `req` / `res` only
- Services: validation, business rules, transactions
- Repositories: parameterized SQL only

Never put SQL or business logic in route files.

---

## Database schema

Entity-relationship overview of the PostgreSQL schema (core product tables).

```mermaid
erDiagram
    users {
        uuid id PK
        text name
        email email
        text password_hash
        text avatar_url
        boolean is_active
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
        account_type account_type
        text google_id
        text avatar_public_id
        timestamptz avatar_updated_at
    }
    workspaces {
        uuid id PK
        text name
        uuid owner_id FK
        timestamptz created_at
        timestamptz updated_at
        public_slug public_slug
    }
    workspace_members {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        workspace_role role
        timestamptz created_at
    }
    workspace_invitations {
        uuid id PK
        uuid workspace_id FK
        email email
        workspace_role role
        text token
        invitation_status status
        uuid invited_by FK
        timestamptz expires_at
        timestamptz accepted_at
        timestamptz created_at
    }
    clusters {
        uuid id PK
        uuid workspace_id FK
        uuid created_by FK
        text name
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    mock_tests {
        uuid id PK
        uuid workspace_id FK
        uuid cluster_id FK
        uuid created_by FK
        text name
        text description
        integer exam_year
        integer duration_minutes
        integer total_questions
        numeric marks_per_correct
        numeric negative_marks_per_wrong
        mock_test_status status
        jsonb settings
        timestamptz published_at
        timestamptz created_at
        timestamptz updated_at
        boolean is_catalog_listed
    }
    uploaded_files {
        uuid id PK
        uuid workspace_id FK
        uuid mock_test_id FK
        uuid uploaded_by FK
        text original_filename
        text storage_key
        text mime_type
        bigint file_size_bytes
        text sha256_hash
        jsonb metadata
        timestamptz created_at
    }
    processing_jobs {
        uuid id PK
        uuid workspace_id FK
        uuid mock_test_id FK
        uuid uploaded_file_id FK
        uuid requested_by FK
        processing_job_status status
        text current_stage
        integer progress_percent
        jsonb input_config
        jsonb output_summary
        text error_message
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
        integer retry_count
    }
    processing_job_events {
        uuid id PK
        uuid job_id FK
        text stage
        text message
        jsonb payload
        timestamptz created_at
    }
    question_contents {
        uuid id PK
        uuid workspace_id FK
        text topic
        text subtopic
        text passage
        text question_text
        text explanation
        question_type question_type
        uuid_array correct_option_indexes
        numeric marks_per_correct
        numeric negative_marks_per_wrong
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
        jsonb options
    }
    question_slots {
        uuid id PK
        uuid workspace_id FK
        uuid mock_test_id FK
        integer question_no
        integer source_page
        numeric confidence
        question_slot_status status
        timestamptz created_at
        timestamptz updated_at
        uuid source_question_id FK
        uuid content_id FK
    }
    question_assets {
        uuid id PK
        uuid question_id FK
        text asset_type
        text storage_path
        integer page_number
        timestamptz created_at
        text source
        text placement
        text slot_key
    }
    question_duplicate_pairs {
        uuid id PK
        uuid workspace_id FK
        uuid question_id_a FK
        uuid question_id_b FK
        numeric similarity_score
        text status
        timestamptz detected_at
        timestamptz resolved_at
        uuid resolved_by FK
    }
    playable_mock_test_questions {
        uuid questionId PK
        uuid mock_test_id FK
        integer questionNo
        text topic
        text subtopic
        text passage
        text text
        jsonb options
        jsonb correctOptionIndex
        question_type questionType
        text explanation
    }
    mock_test_generation_sources {
        uuid mock_test_id FK
        uuid source_mock_test_id FK
    }
    extraction_templates {
        uuid id PK
        uuid workspace_id FK
        uuid created_by FK
        text slug
        text name
        text description
        text category
        text difficulty
        integer question_count
        integer duration_minutes
        numeric marks_per_correct
        numeric negative_marks_per_wrong
        jsonb tags
        jsonb sections
        text color
        integer usage_count
        numeric rating
        jsonb settings
        timestamptz created_at
        timestamptz updated_at
        boolean is_active
        integer rating_count
    }
    extraction_template_applications {
        uuid id PK
        uuid template_id FK
        uuid workspace_id FK
        uuid mock_test_id FK
        uuid applied_by FK
        timestamptz created_at
    }
    extraction_template_ratings {
        uuid id PK
        uuid template_id FK
        uuid user_id FK
        smallint rating
        timestamptz created_at
        timestamptz updated_at
    }
    exam_attempts {
        uuid id PK
        uuid workspace_id FK
        uuid mock_test_id FK
        uuid user_id FK
        exam_attempt_status status
        timestamptz started_at
        timestamptz submitted_at
        integer total_questions
        integer attempted_count
        integer correct_count
        integer wrong_count
        integer unattempted_count
        numeric score
        jsonb metadata
        text_array topics
        integer duration_minutes
        email taker_email
    }
    exam_answers {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        integer_array selected_option_indexes
        boolean is_correct
        numeric marks_awarded
        timestamptz answered_at
        timestamptz created_at
    }
    cohorts {
        uuid id PK
        uuid workspace_id FK
        text name
        timestamptz created_at
    }
    cohort_members {
        uuid cohort_id FK
        email taker_email FK
        timestamptz added_at
    }
    shared_mock_tests {
        uuid id PK
        uuid mock_test_id FK
        text share_token
        boolean is_active
        timestamptz expires_at
        timestamptz created_at
    }
    publisher_subscriptions {
        uuid id PK
        text subscriber_key
        uuid user_id FK
        uuid workspace_id FK
        timestamptz created_at
    }
    schema_migrations {
        text id PK
        timestamptz applied_at
    }

    users ||--o{ workspaces : "owns"
    users ||--o{ workspace_members : "joins"
    workspaces ||--o{ workspace_members : "has members"
    workspaces ||--o{ workspace_invitations : "receives"
    users ||--o{ workspace_invitations : "sends"
    workspaces ||--o{ clusters : "contains"
    users ||--o{ clusters : "creates"

    workspaces ||--o{ mock_tests : "contains"
    clusters ||--o{ mock_tests : "groups"
    users ||--o{ mock_tests : "creates"
    mock_tests ||--o{ uploaded_files : "has files"
    workspaces ||--o{ uploaded_files : "stores"
    users ||--o{ uploaded_files : "uploads"

    uploaded_files ||--o{ processing_jobs : "processed by"
    mock_tests ||--o{ processing_jobs : "generates"
    workspaces ||--o{ processing_jobs : "owns"
    users ||--o{ processing_jobs : "requests"
    processing_jobs ||--o{ processing_job_events : "emits"

    workspaces ||--o{ question_contents : "owns"
    mock_tests ||--o{ question_slots : "contains"
    workspaces ||--o{ question_slots : "owns"
    question_contents ||--o{ question_slots : "assigned to"
    question_contents ||--o{ question_assets : "has assets"
    mock_tests ||--o{ playable_mock_test_questions : "contains"
    mock_tests ||--o{ mock_test_generation_sources : "generated test"
    mock_tests ||--o{ mock_test_generation_sources : "source test"
    workspaces ||--o{ question_duplicate_pairs : "tracks duplicates"
    question_contents ||--o{ question_duplicate_pairs : "question A"
    question_contents ||--o{ question_duplicate_pairs : "question B"
    users ||--o{ question_duplicate_pairs : "resolves"

    workspaces ||--o{ extraction_templates : "owns"
    users ||--o{ extraction_templates : "creates"
    extraction_templates ||--o{ extraction_template_applications : "applied"
    mock_tests ||--o{ extraction_template_applications : "uses"
    workspaces ||--o{ extraction_template_applications : "contains"
    users ||--o{ extraction_template_applications : "applies"
    extraction_templates ||--o{ extraction_template_ratings : "receives"
    users ||--o{ extraction_template_ratings : "rates"

    mock_tests ||--o{ exam_attempts : "has attempts"
    users ||--o{ exam_attempts : "takes"
    workspaces ||--o{ exam_attempts : "records"
    exam_attempts ||--o{ exam_answers : "contains"
    question_contents ||--o{ exam_answers : "answered"

    workspaces ||--o{ cohorts : "has cohorts"
    cohorts ||--o{ cohort_members : "has members"

    mock_tests ||--o{ shared_mock_tests : "shared through"
    users ||--o{ publisher_subscriptions : "subscribes"
    workspaces ||--o{ publisher_subscriptions : "publishes"
```

### Schema domains (quick map)

| Domain               | Tables                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Identity & access    | `users`, `workspaces`, `workspace_members`, `workspace_invitations`                        |
| Content organization | `clusters`, `mock_tests`, `uploaded_files`                                                 |
| Extraction pipeline  | `processing_jobs`, `processing_job_events`, `extraction_templates`, applications & ratings |
| Questions            | `question_contents`, `question_slots`, `question_assets`, duplicates, playable view        |
| Delivery             | `exam_attempts`, `exam_answers`, `cohorts`, `cohort_members`, `shared_mock_tests`          |
| Catalog              | `publisher_subscriptions`, `mock_tests.is_catalog_listed`                                  |

Migrations live in `backend/migrations/` and are applied with `npm run db:migrate`.

---

## Repository structure

```text
PaperFlow/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # editor, cluster workspace, session, shared UI
│   │   ├── pages/            # route-level screens
│   │   ├── hooks/
│   │   ├── lib/              # api client, auth, diagram context
│   │   └── utils/
│   └── package.json
│
└── backend/
    ├── src/                  # Express API
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/
    │   ├── repositories/
    │   ├── middleware/
    │   ├── lib/
    │   └── db/               # migrate + connection helpers
    ├── migrations/           # numbered SQL migrations
    ├── worker/               # Python job processor
    │   ├── ai/               # Gemini / OpenAI providers, schemas
    │   ├── asset_extractor.py
    │   └── worker.py
    ├── compose.yaml          # local PostgreSQL
    └── package.json
```

---

## Prerequisites

- **Node.js** 22.x
- **Python** 3.10+ (for the worker)
- **Docker** (recommended for PostgreSQL)
- Optional: **Tesseract OCR** for scanned PDFs
- Optional: **Gemini** and/or **OpenAI** API key for AI extraction
- Optional: **Cloudinary** account for diagram storage
- Optional: **Backblaze B2** (or S3-compatible) for PDF object storage

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/KUSHALROY-001/PaperFlow PaperFlow
cd PaperFlow

# API
cd backend
cp .env.example .env   # create from the variables section below if no example exists
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

Default compose credentials:

| Variable | Value       |
| -------- | ----------- |
| User     | `postgres`  |
| Password | `postgres`  |
| Database | `paperflow` |
| Port     | `5432`      |

### 3. Configure environment

Set at least:

```env
# backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paperflow
JWT_SECRET=change-me-to-a-long-random-string
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

Frontend:

```env
# frontend/.env
VITE_API_URL=http://localhost:4000
```

### 4. Migrate the database

```bash
cd backend
npm run db:migrate
npm run db:check
```

### 5. Run API + frontend

```bash
# terminal 1 — API
cd backend && npm run dev

# terminal 2 — SPA
cd frontend && npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

### 6. Run the worker (needed for PDF extraction)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r worker/requirements.txt

# process one job, or poll continuously
npm run worker:once
# or
npm run worker
```

---

## Environment variables

### Backend / worker (common)

| Variable                                                                       | Purpose                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| `DATABASE_URL`                                                                 | PostgreSQL connection string                     |
| `DB_CA_CERT` / `DB_CA_CERT_PATH`                                               | TLS CA for managed Postgres                      |
| `PORT`                                                                         | API port (default `4000`)                        |
| `CORS_ORIGIN`                                                                  | Allowed frontend origin                          |
| `NODE_ENV`                                                                     | `development` / `production`                     |
| `JWT_SECRET`                                                                   | Sign session tokens (set in auth module if used) |
| `CLOUDINARY_URL`                                                               | Diagram image storage                            |
| `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT_URL`, `B2_REGION` | PDF object storage                               |
| `AI_PROVIDER`                                                                  | `gemini` or `openai`                             |
| `AI_MODEL`                                                                     | Model id for the chosen provider                 |
| `GEMINI_API_KEY`                                                               | Gemini access                                    |
| `AI_PDF_RENDER_SCALE`                                                          | Page render scale for vision                     |
| `AI_PDF_PAGES_PER_CHUNK`                                                       | Pages per vision request                         |
| `WORKER_CONCURRENCY` / `WORKER_MAX_JOBS_PER_RUN`                               | Throughput controls                              |

Never put provider API keys in the frontend env files.

### Frontend

| Variable       | Purpose                     |
| -------------- | --------------------------- |
| `VITE_API_URL` | Base URL of the Express API |

---

## Running the worker

The worker claims queued `processing_jobs` with `FOR UPDATE SKIP LOCKED`, then:

1. Downloads the source PDF from object storage
2. Extracts text (PyMuPDF) or OCR when needed
3. Optionally runs vision / LLM structured extraction
4. Crops diagrams from page renders (padded bboxes → PNG)
5. Replaces questions + options for the target mock test
6. Uploads diagram assets and marks the job completed / failed

```bash
# one job
python -m worker.worker --once

# continuous
python -m worker.worker
```

npm aliases from `backend/`:

```bash
npm run worker:once
npm run worker
```

---

## Key product flows

1. **Create a cluster** → add a mock test
2. **Upload PDF** → processing job runs in the background
3. **Review** extracted questions (Review tab / Review Queue)
4. **Edit** stem, options, math, and per-slot diagrams in the Question Editor
5. **Publish** / share / open in the public catalog
6. Students **attempt** the mock; results appear under My Results / Students

Extraction templates encode exam structure (sections, question counts, marking). Template-driven papers (e.g. JEE Advanced) benefit from correct template settings so subjects and sections align with the real paper.

---

## API surface (overview)

All authenticated routes use:

```http
Authorization: Bearer <token>
```

Representative groups:

| Area            | Examples                                                                            |
| --------------- | ----------------------------------------------------------------------------------- |
| Auth            | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`                 |
| Clusters        | `GET/POST /api/clusters`, `PATCH/DELETE /api/clusters/:id`                          |
| Mock tests      | CRUD under clusters; `POST .../publish`; playable export                            |
| Questions       | List by mock test; CRUD; diagram upload/crop/placement/delete (optional `:slotKey`) |
| Processing      | Job status / events                                                                 |
| Team & students | Invites, members, cohorts, attempts                                                 |
| Catalog         | Public catalog + shared mock access                                                 |
| Templates       | Extraction templates CRUD                                                           |

Diagram endpoints accept an optional **slot key** so option images and multi-diagram stems are first-class (not only the legacy `default` slot).

---

## Diagrams & multi-slot images

- Markers in text/options: `![[img:slot_key]]`
- Assets live in `question_assets` and Cloudinary, keyed by `question_id + slot_key`
- API attaches `diagramAssets: [{ slotKey, url, placement, ... }]`
- Frontend resolves markers via `DiagramAssetsProvider` + `MathText` / TipTap `ImageNode`
- Extraction crops use **~2×** the model bounding box (50% padding per side, min pixel floor) so clipped option figures still include usable context; authors refine with **Crop** in the editor

---

## Development notes

- **Frontend:** `cd frontend && npm run dev` / `npm run build` / `npm run lint`
- **Backend:** `cd backend && npm run dev`
- Prefer relative imports and the existing domain folders; do not introduce parallel architecture
- Parameterized SQL only — no string-interpolated queries
- Keep feature work split across route / controller / service / repository

Useful scripts:

```bash
# backend
npm run db:migrate
npm run db:check
npm run db:backfill-math
npm run db:backfill-code
```

---

## Deployment

A typical production split:

1. **PostgreSQL** (managed) — run migrations on deploy
2. **API** (`npm start` in `backend/`) — set `DATABASE_URL`, `CORS_ORIGIN`, storage + AI secrets
3. **Worker** as a separate process/service running `python -m worker.worker`
4. **Frontend** static build (`npm run build`) served by CDN / static host with `VITE_API_URL` pointing at the API

Current public instance: [https://paperflow-ki5w.onrender.com/](https://paperflow-ki5w.onrender.com/)

Ensure the worker process has the same DB and storage credentials as the API, or extraction jobs will queue but never complete.

---

## Contributing

1. Fork and create a feature branch
2. Match existing patterns (four-layer backend, component layout on the frontend)
3. Run migrations for schema changes; never edit applied migration files in place — add a new numbered migration
4. Open a PR with a short description of the user-facing change and any env vars required

---

## License

Private / unlicensed unless a `LICENSE` file is added to the repository. Add an explicit license before publishing the source as open source.

---

## Acknowledgments

Built for real exam-prep workflows: PDF chaos in, structured mock tests out — with humans still in control of the final paper.
