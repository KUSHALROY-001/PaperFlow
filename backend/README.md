# PaperFlow Backend

This backend currently contains the PostgreSQL database implementation for PaperFlow.

## Setup

1. Start PostgreSQL:

```bash
docker compose up -d
```

2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL`.
4. Install dependencies:

```bash
npm install
```

5. Run migrations:

```bash
npm run db:migrate
```

6. Check the connection:

```bash
npm run db:check
```

## Core Data Model

- `clusters` are lightweight containers with only `name` and optional `description`.
- `mock_tests` belong to clusters.
- `uploaded_files` track raw PDF uploads.
- `processing_jobs` and `processing_job_events` track OCR/parsing/AI cleanup work.
- `questions` and `question_options` store reviewed mock-test questions.
- `exam_attempts` and `exam_answers` store user practice/test results.

The schema supports Practice-JECA-compatible exports by joining `questions` and `question_options`.

## API

Start the backend:

```bash
npm run dev
```

The API runs on `http://localhost:4000` by default.

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Send authenticated requests with:

```txt
Authorization: Bearer <token>
```

### Clusters

- `GET /api/clusters`
- `POST /api/clusters`
- `GET /api/clusters/:clusterId`
- `PATCH /api/clusters/:clusterId`
- `DELETE /api/clusters/:clusterId`

Create cluster body:

```json
{
  "name": "JECA",
  "description": "Optional description"
}
```

### Mock Tests

- `GET /api/mock-tests`
- `GET /api/mock-tests/:mockTestId`
- `PATCH /api/mock-tests/:mockTestId`
- `DELETE /api/mock-tests/:mockTestId`
- `POST /api/mock-tests/:mockTestId/publish`
- `GET /api/clusters/:clusterId/mock-tests`
- `POST /api/clusters/:clusterId/mock-tests`

Create mock test body:

```json
{
  "name": "JECA PYQ 2024",
  "description": "Optional description",
  "durationMinutes": 120,
  "marksPerCorrect": 1,
  "negativeMarksPerWrong": 0.25
}
```

### Questions

- `GET /api/mock-tests/:mockTestId/questions`
- `POST /api/questions`
- `GET /api/questions/:questionId`
- `PATCH /api/questions/:questionId`
- `DELETE /api/questions/:questionId`

Create question body:

```json
{
  "mockTestId": "uuid",
  "questionNo": 1,
  "topic": "C Programming",
  "questionText": "Which keyword declares a constant?",
  "options": ["const", "let", "var", "static"],
  "correctOptionIndexes": [0],
  "questionType": "single"
}
```

### Practice-JECA Play Export

- `GET /api/mock-tests/:mockTestId/play`

Returns:

```json
{
  "mockTest": {
    "id": "uuid",
    "name": "JECA PYQ 2024",
    "durationMinutes": 120,
    "negativeMarking": 0.25
  },
  "questions": []
}
```

## OCR Worker

Install Python dependencies:

```bash
pip install -r worker\requirements.txt
```

Process queued PDF jobs once:

```bash
npm run worker:once
```

Run continuously:

```bash
npm run worker
```

Current worker behavior:

- reads queued `processing_jobs`
- extracts selectable PDF text with PyMuPDF
- converts scanned PDFs into searchable PDFs with Tesseract OCR when needed
- parses common MCQ formats
- optionally sends text chunks to OpenAI or Gemini for strict JSON cleanup
- inserts rows into `questions` and `question_options`
- moves mock tests to `review` when questions are found
- marks jobs as `completed` or `failed`

Image-only scanned PDFs will need the later OCR layer, such as Tesseract or a vision model.

Enable AI cleanup in `backend\.env`:

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
