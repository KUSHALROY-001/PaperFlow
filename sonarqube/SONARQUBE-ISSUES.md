# SonarQube Issues

Project: **KUSHALROY-001_PaperFlow**

Total issues: **603**

Generated: **2026-09-03 19:40:16**

---

## Summary

- **BLOCKER:** 0
- **CRITICAL:** 63
- **MAJOR:** 291
- **MINOR:** 249
- **INFO:** 0

### Issue Types

- **CODE_SMELL:** 554
- **BUG:** 39
- **VULNERABILITY:** 10

---

# CRITICAL Issues

Total: **63**

## BUG

### `backend/src/lib/math-validator.selftest.js`

- **javascript:S2871** - Line 82
  - Type: BUG
  - Message: Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.
  - Estimated effort: 10min
  - Issue ID: AaBnWnww78DfsSBSR8tB

- **javascript:S2871** - Line 83
  - Type: BUG
  - Message: Provide a compare function to avoid sorting elements alphabetically.
  - Estimated effort: 10min
  - Issue ID: AaBnWnww78DfsSBSR8tC

### `backend/src/repositories/mock-tests.repository.js`

- **javascript:S2871** - Line 447
  - Type: BUG
  - Message: Provide a compare function to avoid sorting elements alphabetically.
  - Estimated effort: 10min
  - Issue ID: AaBnWnyS78DfsSBSR8ta

### `backend/src/services/attempts.service.js`

- **javascript:S2871** - Line 59
  - Type: BUG
  - Message: Provide a compare function to avoid sorting elements alphabetically.
  - Estimated effort: 10min
  - Issue ID: AaBnWnv578DfsSBSR8sZ

### `frontend/src/components/cluster/OverviewTab.jsx`

- **javascript:S2871** - Line 57
  - Type: BUG
  - Message: Provide a compare function to avoid sorting elements alphabetically.
  - Estimated effort: 10min
  - Issue ID: AaBnWngS78DfsSBSR8ny

## CODE_SMELL

### `backend/migrations/002_extraction_templates.sql`

- **plsql:S1192** - Line 9
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1Z78DfsSBSR8uR

- **plsql:S1192** - Line 9
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1Z78DfsSBSR8uS

- **plsql:S1192** - Line 71
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1Z78DfsSBSR8uT

### `backend/migrations/005_team_invitations.sql`

- **plsql:S1192** - Line 10
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1P78DfsSBSR8uQ

### `backend/migrations/010_extraction_templates_syllabus.sql`

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 24
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8ud

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 37
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8ue

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 44
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8uf

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 51
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8ug

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 64
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8uh

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 71
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8ui

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 81
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8uj

- **plsql:LiteralsNonPrintableCharactersCheck** - Line 86
  - Type: CODE_SMELL
  - Message: An illegal character with code point 10 was found in this literal.
  - Estimated effort: 10min
  - Issue ID: AaBnWn2D78DfsSBSR8uk

### `backend/migrations/024_duplicate_detection.sql`

- **plsql:S1192** - Line 36
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn0e78DfsSBSR8uB

### `backend/migrations/027_exclude_rejected_questions.sql`

- **plsql:S1192** - Line 73
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1I78DfsSBSR8uP

### `backend/migrations/030_shared_question_content.sql`

- **plsql:S1192** - Line 222
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 10 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn0p78DfsSBSR8uG

### `backend/migrations/041_diagram_inline_markers.sql`

- **plsql:S1192** - Line 21
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 4 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1678DfsSBSR8ua

- **plsql:S1192** - Line 25
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 3 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1678DfsSBSR8uc

- **plsql:S1192** - Line 28
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal 4 times.
  - Estimated effort: 4min
  - Issue ID: AaBnWn1678DfsSBSR8ub

### `backend/src/db/backfill-code-formatting.js`

- **javascript:S3776** - Line 51
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
  - Estimated effort: 7min
  - Issue ID: AaBnWntu78DfsSBSR8sF

### `backend/src/db/backfill-math-formatting.js`

- **javascript:S3776** - Line 96
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
  - Estimated effort: 10min
  - Issue ID: AaBnWntl78DfsSBSR8sC

- **javascript:S3776** - Line 221
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed.
  - Estimated effort: 20min
  - Issue ID: AaBnWntl78DfsSBSR8sD

### `backend/src/db/backfill-math-validation.js`

- **javascript:S3776** - Line 65
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
  - Estimated effort: 9min
  - Issue ID: AaBnWnt278DfsSBSR8sH

### `backend/src/lib/code-indenter.js`

- **javascript:S3776** - Line 106
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
  - Estimated effort: 6min
  - Issue ID: AaBnWnxL78DfsSBSR8tN

### `backend/src/lib/math-validator.js`

- **javascript:S3776** - Line 34
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
  - Estimated effort: 8min
  - Issue ID: AaBnWnxD78DfsSBSR8tJ

### `backend/src/lib/worker-runner.js`

- **javascript:S3776** - Line 161
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
  - Estimated effort: 10min
  - Issue ID: AaBnWnw678DfsSBSR8tE

### `backend/src/services/attempts.service.js`

- **javascript:S3776** - Line 63
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
  - Estimated effort: 6min
  - Issue ID: AaBnWnv578DfsSBSR8sa

### `backend/src/services/questions.service.js`

- **javascript:S3776** - Line 130
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
  - Estimated effort: 8min
  - Issue ID: AaBnWnvI78DfsSBSR8sS

### `backend/worker/ai/gemini_provider.py`

- **python:S3776** - Line 142
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.
  - Estimated effort: 15min
  - Issue ID: AaBnWnzE78DfsSBSR8tp

- **python:S3776** - Line 363
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 58 to the 15 allowed.
  - Estimated effort: 48min
  - Issue ID: AaBnWnzE78DfsSBSR8tq

- **python:S1192** - Line 23
  - Type: CODE_SMELL
  - Message: Define a constant instead of duplicating this literal "application/json" 4 times.
  - Estimated effort: 8min
  - Issue ID: AaBnWnzE78DfsSBSR8to

### `backend/worker/ai/provider.py`

- **python:S3776** - Line 184
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 69 to the 15 allowed.
  - Estimated effort: 59min
  - Issue ID: AaBnWnyo78DfsSBSR8tb

- **python:S3776** - Line 1391
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 71 to the 15 allowed.
  - Estimated effort: 1h1min
  - Issue ID: AaBnWnyo78DfsSBSR8th

- **python:S3776** - Line 858
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
  - Estimated effort: 16min
  - Issue ID: AaBnWnyo78DfsSBSR8tf

- **python:S3776** - Line 1077
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 73 to the 15 allowed.
  - Estimated effort: 1h3min
  - Issue ID: AaBnWnyo78DfsSBSR8tg

- **python:S3776** - Line 601
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
  - Estimated effort: 7min
  - Issue ID: AaBnWnyo78DfsSBSR8tc

### `backend/worker/ai/schemas.py`

- **python:S3776** - Line 338
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 73 to the 15 allowed.
  - Estimated effort: 1h3min
  - Issue ID: AaBnWny378DfsSBSR8tm

- **python:S3776** - Line 199
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
  - Estimated effort: 6min
  - Issue ID: AaBnWny378DfsSBSR8tk

### `backend/worker/db.py`

- **python:S5709** - Line 137
  - Type: CODE_SMELL
  - Message: Derive this class from "Exception" instead of "BaseException".
  - Estimated effort: 10min
  - Issue ID: AaBnWn0O78DfsSBSR8t8

### `backend/worker/math_validator.py`

- **python:S3776** - Line 46
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
  - Estimated effort: 8min
  - Issue ID: AaBnWnz_78DfsSBSR8t7

### `backend/worker/question_parser.py`

- **python:S3776** - Line 206
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
  - Estimated effort: 9min
  - Issue ID: AaBnWnzf78DfsSBSR8t3

### `backend/worker/reconcile.py`

- **python:S3776** - Line 55
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed.
  - Estimated effort: 17min
  - Issue ID: AaBnWnzW78DfsSBSR8tt

### `backend/worker/worker.py`

- **python:S3776** - Line 125
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed.
  - Estimated effort: 18min
  - Issue ID: AaBnWnzt78DfsSBSR8t4

- **python:S3776** - Line 489
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed.
  - Estimated effort: 13min
  - Issue ID: AaBnWnzt78DfsSBSR8t5

### `frontend/src/components/catalog/CatalogBrowser.jsx`

- **javascript:S3776** - Line 16
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed.
  - Estimated effort: 12min
  - Issue ID: AaBnWnmT78DfsSBSR8p3

### `frontend/src/components/catalog/MockTestDetailModal.jsx`

- **javascript:S3776** - Line 24
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 33 to the 15 allowed.
  - Estimated effort: 23min
  - Issue ID: AaBnWnmd78DfsSBSR8p9

### `frontend/src/components/cluster/OverviewTab.jsx`

- **javascript:S3776** - Line 22
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed.
  - Estimated effort: 25min
  - Issue ID: AaBnWngS78DfsSBSR8nx

### `frontend/src/components/cluster/ReviewTab.jsx`

- **javascript:S3776** - Line 198
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed.
  - Estimated effort: 8min
  - Issue ID: AaBnWnfh78DfsSBSR8nf

### `frontend/src/components/cluster/WorkspaceHeader.jsx`

- **javascript:S3776** - Line 14
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
  - Estimated effort: 7min
  - Issue ID: AaBnWnfs78DfsSBSR8nm

### `frontend/src/components/my-results/AttemptCard.jsx`

- **javascript:S3776** - Line 17
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.
  - Estimated effort: 15min
  - Issue ID: AaBnWnlU78DfsSBSR8pm

### `frontend/src/components/question-bank/AddToTestModal.jsx`

- **javascript:S3776** - Line 30
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
  - Estimated effort: 16min
  - Issue ID: AaBnWnnP78DfsSBSR8qM

### `frontend/src/components/question-editor/EditorHeader.jsx`

- **javascript:S3776** - Line 4
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed.
  - Estimated effort: 11min
  - Issue ID: AaBnWncY78DfsSBSR8lR

### `frontend/src/components/shared/FormattedTextEditor.jsx`

- **javascript:S3776** - Line 224
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
  - Estimated effort: 10min
  - Issue ID: AaBnWneS78DfsSBSR8nE

### `frontend/src/components/shared/ImageNode.jsx`

- **javascript:S3776** - Line 30
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed.
  - Estimated effort: 9min
  - Issue ID: AaBnWneu78DfsSBSR8nQ

### `frontend/src/pages/ClusterWorkspace.jsx`

- **javascript:S3776** - Line 25
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed.
  - Estimated effort: 7min
  - Issue ID: AaBnWnpO78DfsSBSR8qy

### `frontend/src/utils/codeIndenter.js`

- **javascript:S3776** - Line 60
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.
  - Estimated effort: 16min
  - Issue ID: AaBnWnsZ78DfsSBSR8rq

- **javascript:S3776** - Line 175
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed.
  - Estimated effort: 6min
  - Issue ID: AaBnWnsZ78DfsSBSR8ru

### `frontend/src/utils/questionEditorHelpers.js`

- **javascript:S3776** - Line 178
  - Type: CODE_SMELL
  - Message: Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed.
  - Estimated effort: 10min
  - Issue ID: AaBnWnsG78DfsSBSR8rl

## VULNERABILITY

### `backend/worker/cloudinary_storage.py`

- **python:S4790** - Line 58
  - Type: VULNERABILITY
  - Message: Make sure that hashing data is safe here.
  - Estimated effort: 30min
  - Issue ID: AaBnWnzN78DfsSBSR8tr

---

# MAJOR Issues

Total: **291**

## BUG

### `backend/worker/ai/schemas.py`

- **python:S1764** - Line 575
  - Type: BUG
  - Message: Correct one of the identical sub-expressions on both sides of operator "!=".
  - Estimated effort: 2min
  - Issue ID: AaBnWny378DfsSBSR8tn

### `frontend/src/components/howItWorks/UploadAnimation.jsx`

- **javascript:S3923** - Line 352
  - Type: BUG
  - Message: This conditional operation returns the same value whether the condition is "true" or "false".
  - Estimated effort: 15min
  - Issue ID: AaBnWnoO78DfsSBSR8ql

### `frontend/src/index.css`

- **css:S8778** - Line 9
  - Type: BUG
  - Message: Invalid position for @import rule
  - Estimated effort: 1min
  - Issue ID: AaBnWntD78DfsSBSR8r8

## CODE_SMELL

### `backend/migrations/030_shared_question_content.sql`

- **plsql:S125** - Line 39
  - Type: CODE_SMELL
  - Message: Remove this commented out code.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0p78DfsSBSR8uC

- **plsql:S1138** - Line 250
  - Type: CODE_SMELL
  - Message: Refactor this SQL query to eliminate the use of EXISTS.
  - Estimated effort: 1h
  - Issue ID: AaBnWn0p78DfsSBSR8uD

### `backend/src/controllers/mock-tests.controller.js`

- **javascript:S8786** - Line 182
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnuA78DfsSBSR8sJ

### `backend/src/controllers/question-assets.controller.js`

- **javascript:S7760** - Line 26
  - Type: CODE_SMELL
  - Message: Prefer default parameters over reassignment.
  - Estimated effort: 5min
  - Issue ID: AaBnWnuL78DfsSBSR8sK

### `backend/src/db/backfill-code-formatting.js`

- **javascript:S7785** - Line 125
  - Type: CODE_SMELL
  - Message: Prefer top-level await over using a promise chain.
  - Estimated effort: 5min
  - Issue ID: AaBnWntu78DfsSBSR8sG

### `backend/src/db/backfill-math-formatting.js`

- **javascript:S7785** - Line 353
  - Type: CODE_SMELL
  - Message: Prefer top-level await over using a promise chain.
  - Estimated effort: 5min
  - Issue ID: AaBnWntl78DfsSBSR8sE

### `backend/src/db/backfill-math-validation.js`

- **javascript:S7785** - Line 148
  - Type: CODE_SMELL
  - Message: Prefer top-level await over using a promise chain.
  - Estimated effort: 5min
  - Issue ID: AaBnWnt278DfsSBSR8sI

### `backend/src/db/check.js`

- **javascript:S7785** - Line 13
  - Type: CODE_SMELL
  - Message: Prefer top-level await over using a promise chain.
  - Estimated effort: 5min
  - Issue ID: AaBnWntU78DfsSBSR8r-

### `backend/src/db/migrate.js`

- **javascript:S7785** - Line 59
  - Type: CODE_SMELL
  - Message: Prefer top-level await over using a promise chain.
  - Estimated effort: 5min
  - Issue ID: AaBnWntN78DfsSBSR8r9

### `backend/src/lib/code-indenter.js`

- **javascript:S5843** - Line 100
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its complexity from 32 to the 20 allowed.
  - Estimated effort: 32min
  - Issue ID: AaBnWnxL78DfsSBSR8tM

### `backend/src/lib/pdf-export/table-html.js`

- **javascript:S4624** - Line 8
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnwC78DfsSBSR8sf

### `backend/src/lib/pdf-export/text-blocks.js`

- **javascript:S8786** - Line 46
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnwU78DfsSBSR8sk

- **javascript:S8786** - Line 59
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnwU78DfsSBSR8sm

### `backend/src/lib/pdf-page-render-client.js`

- **javascript:S8786** - Line 19
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnxv78DfsSBSR8tS

### `backend/src/lib/worker-runner.js`

- **javascript:S8786** - Line 35
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnw678DfsSBSR8tD

### `backend/src/routes/debug.routes.js`

- **javascript:S8786** - Line 25
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnup78DfsSBSR8sN

### `backend/src/services/attempts.service.js`

- **javascript:S3358** - Line 56
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnv578DfsSBSR8sY

- **javascript:S3358** - Line 97
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnv578DfsSBSR8sb

### `backend/src/services/extraction-templates.service.js`

- **javascript:S8786** - Line 47
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnve78DfsSBSR8sW

### `backend/src/services/questions.service.js`

- **javascript:S3358** - Line 150
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnvI78DfsSBSR8sT

### `backend/src/services/review-queue.service.js`

- **javascript:S3358** - Line 115
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnuy78DfsSBSR8sP

### `backend/worker/ai/schemas.py`

- **python:S8786** - Line 302
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWny378DfsSBSR8tl

- **python:S5603** - Line 20
  - Type: CODE_SMELL
  - Message: Remove this unused function declaration.
  - Estimated effort: 5min
  - Issue ID: AaBnWny378DfsSBSR8tj

- **python:S1066** - Line 231
  - Type: CODE_SMELL
  - Message: Merge this if statement with the enclosing one.
  - Estimated effort: 5min
  - Issue ID: AaBnWny378DfsSBSR8ti

### `backend/worker/db.py`

- **python:S1172** - Line 230
  - Type: CODE_SMELL
  - Message: Remove the unused function parameter "pdf_path".
  - Estimated effort: 5min
  - Issue ID: AaBnWn0O78DfsSBSR8t9

### `backend/worker/question_parser.py`

- **python:S5869** - Line 9
  - Type: CODE_SMELL
  - Message: Remove duplicates in this character class.
  - Estimated effort: 5min
  - Issue ID: AaBnWnzf78DfsSBSR8tu

- **python:S5869** - Line 9
  - Type: CODE_SMELL
  - Message: Remove duplicates in this character class.
  - Estimated effort: 5min
  - Issue ID: AaBnWnzf78DfsSBSR8tv

- **python:S6019** - Line 9
  - Type: CODE_SMELL
  - Message: Fix this reluctant quantifier that will only ever match 1 repetition.
  - Estimated effort: 10min
  - Issue ID: AaBnWnzf78DfsSBSR8tw

- **python:S6395** - Line 9
  - Type: CODE_SMELL
  - Message: Unwrap this unnecessarily grouped subpattern.
  - Estimated effort: 5min
  - Issue ID: AaBnWnzf78DfsSBSR8tx

- **python:S6395** - Line 9
  - Type: CODE_SMELL
  - Message: Unwrap this unnecessarily grouped subpattern.
  - Estimated effort: 5min
  - Issue ID: AaBnWnzf78DfsSBSR8ty

- **python:S5843** - Line 9
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its complexity from 26 to the 20 allowed.
  - Estimated effort: 10min
  - Issue ID: AaBnWnzf78DfsSBSR8tz

- **python:S8786** - Line 26
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnzf78DfsSBSR8t0

- **python:S8786** - Line 29
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnzf78DfsSBSR8t1

- **python:S5869** - Line 165
  - Type: CODE_SMELL
  - Message: Remove duplicates in this character class.
  - Estimated effort: 5min
  - Issue ID: AaBnWnzf78DfsSBSR8t2

### `frontend/src/components/analytics/AnalyticsSummaryRow.jsx`

- **javascript:S6479** - Line 8
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWniE78DfsSBSR8oj

### `frontend/src/components/analytics/CustomTooltip.jsx`

- **javascript:S6479** - Line 7
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnh178DfsSBSR8og

### `frontend/src/components/analytics/QuestionStatusChart.jsx`

- **javascript:S6479** - Line 22
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnh978DfsSBSR8oh

- **javascript:S6479** - Line 31
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnh978DfsSBSR8oi

### `frontend/src/components/analytics/RecentClusterPerformance.jsx`

- **javascript:S6479** - Line 13
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWniM78DfsSBSR8ok

- **javascript:S3358** - Line 27
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWniM78DfsSBSR8ol

- **javascript:S3358** - Line 41
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWniM78DfsSBSR8om

### `frontend/src/components/app-shell/GlobalHeaderSearch.jsx`

- **javascript:S6772** - Line 142
  - Type: CODE_SMELL
  - Message: Ambiguous spacing before next element span
  - Estimated effort: 5min
  - Issue ID: AaBnWnht78DfsSBSR8oe

### `frontend/src/components/app-shell/Sidebar.jsx`

- **javascript:S6479** - Line 52
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnhj78DfsSBSR8od

### `frontend/src/components/app-shell/SubscribedPublishersMenu.jsx`

- **javascript:S6848** - Line 30
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnha78DfsSBSR8oa

- **javascript:S6848** - Line 60
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnha78DfsSBSR8oc

### `frontend/src/components/catalog/CatalogBrowser.jsx`

- **javascript:S3358** - Line 163
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmT78DfsSBSR8p4

- **javascript:S3358** - Line 169
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmT78DfsSBSR8p5

- **javascript:S3358** - Line 171
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmT78DfsSBSR8p6

- **javascript:S6819** - Line 179
  - Type: CODE_SMELL
  - Message: Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmT78DfsSBSR8p8

### `frontend/src/components/catalog/CatalogSettingsPanel.jsx`

- **javascript:S6819** - Line 208
  - Type: CODE_SMELL
  - Message: Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmo78DfsSBSR8qD

- **javascript:S6848** - Line 231
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmo78DfsSBSR8qF

- **javascript:S3358** - Line 274
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmo78DfsSBSR8qG

### `frontend/src/components/catalog/MockTestDetailModal.jsx`

- **javascript:S3358** - Line 136
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmd78DfsSBSR8p_

- **javascript:S4624** - Line 73
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnmd78DfsSBSR8p-

- **javascript:S3358** - Line 361
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmd78DfsSBSR8qA

- **javascript:S3358** - Line 361
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmd78DfsSBSR8qB

### `frontend/src/components/cluster/CreateMockTestModal.jsx`

- **javascript:S6853** - Line 192
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oE

- **javascript:S6853** - Line 210
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oF

- **javascript:S6853** - Line 229
  - Type: CODE_SMELL
  - Message: A form label must have accessible text.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oG

- **javascript:S6853** - Line 140
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oB

- **javascript:S6853** - Line 303
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oI

- **javascript:S6853** - Line 390
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oK

- **javascript:S6853** - Line 437
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oL

- **javascript:S6853** - Line 455
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oM

- **javascript:S6853** - Line 347
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oJ

- **javascript:S6853** - Line 155
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oC

- **javascript:S6853** - Line 173
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oD

- **javascript:S6853** - Line 252
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngx78DfsSBSR8oH

### `frontend/src/components/cluster/MockTestCard.jsx`

- **javascript:S6848** - Line 61
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWngH78DfsSBSR8nw

### `frontend/src/components/cluster/MockTestScoringPanel.jsx`

- **javascript:S6853** - Line 64
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngb78DfsSBSR8n7

- **javascript:S6853** - Line 78
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWngb78DfsSBSR8n8

### `frontend/src/components/cluster/OverviewTab.jsx`

- **javascript:S3358** - Line 90
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8nz

- **javascript:S3358** - Line 185
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n4

- **javascript:S3358** - Line 314
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n5

- **javascript:S3358** - Line 314
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n6

- **javascript:S3358** - Line 97
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n0

- **javascript:S3358** - Line 100
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n1

- **javascript:S3358** - Line 126
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n2

- **javascript:S3358** - Line 131
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWngS78DfsSBSR8n3

### `frontend/src/components/cluster/PhaseWaterCard.jsx`

- **javascript:S3358** - Line 16
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnf978DfsSBSR8ns

- **javascript:S3358** - Line 23
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnf978DfsSBSR8nt

- **javascript:S3358** - Line 30
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnf978DfsSBSR8nu

### `frontend/src/components/cluster/ProcessingTab.jsx`

- **javascript:S3358** - Line 82
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfX78DfsSBSR8ne

- **javascript:S3358** - Line 43
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfX78DfsSBSR8nd

### `frontend/src/components/cluster/ProcessingTimeline.jsx`

- **javascript:S3358** - Line 60
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfH78DfsSBSR8nZ

### `frontend/src/components/cluster/ReviewTab.jsx`

- **javascript:S6819** - Line 266
  - Type: CODE_SMELL
  - Message: Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfh78DfsSBSR8nh

- **javascript:S3358** - Line 210
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfh78DfsSBSR8ng

- **javascript:S3358** - Line 305
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfh78DfsSBSR8ni

- **javascript:S3358** - Line 313
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfh78DfsSBSR8nj

- **javascript:S3358** - Line 333
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfh78DfsSBSR8nk

- **javascript:S3358** - Line 341
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfh78DfsSBSR8nl

### `frontend/src/components/cluster/ShareLinkModal.jsx`

- **javascript:S6848** - Line 44
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWngl78DfsSBSR8n-

- **javascript:S6848** - Line 48
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWngl78DfsSBSR8oA

### `frontend/src/components/cluster/SubmissionCard.jsx`

- **javascript:S3358** - Line 67
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfP78DfsSBSR8na

### `frontend/src/components/cluster/UploadPdfPanel.jsx`

- **javascript:S6853** - Line 104
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnf178DfsSBSR8nr

### `frontend/src/components/cluster/WorkspaceHeader.jsx`

- **javascript:S3358** - Line 96
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfs78DfsSBSR8nn

- **javascript:S3358** - Line 98
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfs78DfsSBSR8no

- **javascript:S3358** - Line 125
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfs78DfsSBSR8np

- **javascript:S3358** - Line 132
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnfs78DfsSBSR8nq

### `frontend/src/components/CreateClusterModal.jsx`

- **javascript:S6853** - Line 68
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnm278DfsSBSR8qH

### `frontend/src/components/dashboard/ActiveJobsPanel.jsx`

- **javascript:S3358** - Line 24
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnj778DfsSBSR8pT

### `frontend/src/components/dashboard/RecentClustersList.jsx`

- **javascript:S3358** - Line 103
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkM78DfsSBSR8pZ

- **javascript:S6848** - Line 124
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkM78DfsSBSR8pb

### `frontend/src/components/dashboard/RecentMockTestsList.jsx`

- **javascript:S3358** - Line 48
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkC78DfsSBSR8pW

- **javascript:S6848** - Line 72
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkC78DfsSBSR8pY

### `frontend/src/components/design-system/CardActionMenu.jsx`

- **javascript:S6848** - Line 81
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhS78DfsSBSR8oY

### `frontend/src/components/design-system/ConfirmDialog.jsx`

- **javascript:S3358** - Line 74
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWng778DfsSBSR8oO

- **javascript:S3358** - Line 67
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWng778DfsSBSR8oN

- **javascript:S3358** - Line 107
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWng778DfsSBSR8oP

### `frontend/src/components/design-system/RenameModal.jsx`

- **javascript:S6848** - Line 40
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhK78DfsSBSR8oU

- **javascript:S6848** - Line 36
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhK78DfsSBSR8oS

- **javascript:S6853** - Line 61
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhK78DfsSBSR8oV

- **javascript:S6853** - Line 76
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhK78DfsSBSR8oW

### `frontend/src/components/design-system/StatTile.jsx`

- **javascript:S3358** - Line 16
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhD78DfsSBSR8oQ

### `frontend/src/components/hero/AIStarBurst.jsx`

- **javascript:S3358** - Line 136
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnls78DfsSBSR8pu

- **javascript:S3358** - Line 142
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnls78DfsSBSR8pv

### `frontend/src/components/hero/MockTestScene.jsx`

- **javascript:S3358** - Line 55
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnl478DfsSBSR8pw

- **javascript:S3358** - Line 60
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnl478DfsSBSR8px

### `frontend/src/components/hero/PDFScene.jsx`

- **javascript:S6479** - Line 126
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnmC78DfsSBSR8pz

- **javascript:S6479** - Line 237
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnmC78DfsSBSR8p0

### `frontend/src/components/hero/ScanBeam.jsx`

- **javascript:S6479** - Line 98
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnmK78DfsSBSR8p1

### `frontend/src/components/HeroAnimation.jsx`

- **javascript:S6479** - Line 344
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnoY78DfsSBSR8qq

- **javascript:S3358** - Line 350
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnoY78DfsSBSR8qr

### `frontend/src/components/howItWorks/HowItWorksSection.jsx`

- **javascript:S6479** - Line 145
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnnz78DfsSBSR8qd

### `frontend/src/components/howItWorks/StepAnimations.jsx`

- **javascript:S3358** - Line 144
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qe

- **javascript:S3358** - Line 150
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qf

- **javascript:S3358** - Line 153
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qg

- **javascript:S3358** - Line 158
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qh

- **javascript:S3358** - Line 439
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qi

- **javascript:S6479** - Line 444
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qj

- **javascript:S6479** - Line 712
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnn_78DfsSBSR8qk

### `frontend/src/components/howItWorks/UploadAnimation.jsx`

- **javascript:S6479** - Line 384
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnoO78DfsSBSR8qm

- **javascript:S6479** - Line 554
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnoO78DfsSBSR8qn

- **javascript:S6479** - Line 719
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnoO78DfsSBSR8qo

### `frontend/src/components/mock-session/SessionQuestionNav.jsx`

- **javascript:S3358** - Line 63
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnY78DfsSBSR8qV

- **javascript:S3358** - Line 65
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnY78DfsSBSR8qW

### `frontend/src/components/mock-session/SessionQuestionView.jsx`

- **javascript:S3358** - Line 29
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnf78DfsSBSR8qX

- **javascript:S6479** - Line 93
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnnf78DfsSBSR8qY

### `frontend/src/components/mock-session/SessionResultsView.jsx`

- **javascript:S3358** - Line 142
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnno78DfsSBSR8qc

- **javascript:S3358** - Line 114
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnno78DfsSBSR8qa

- **javascript:S3358** - Line 119
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnno78DfsSBSR8qb

### `frontend/src/components/my-results/AttemptCard.jsx`

- **javascript:S3358** - Line 80
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlU78DfsSBSR8po

- **javascript:S3358** - Line 82
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlU78DfsSBSR8pp

- **javascript:S3358** - Line 120
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlU78DfsSBSR8pq

### `frontend/src/components/my-results/QuestionReviewList.jsx`

- **javascript:S3358** - Line 39
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlI78DfsSBSR8pi

- **javascript:S3358** - Line 186
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlI78DfsSBSR8pl

- **javascript:S3358** - Line 101
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlI78DfsSBSR8pj

- **javascript:S3358** - Line 127
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlI78DfsSBSR8pk

### `frontend/src/components/my-results/ScoreTrendStrip.jsx`

- **javascript:S3358** - Line 39
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnk_78DfsSBSR8ph

### `frontend/src/components/my-results/TopicBreakdownGrid.jsx`

- **javascript:S3358** - Line 51
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlb78DfsSBSR8pr

### `frontend/src/components/question-bank/AddToTestModal.jsx`

- **javascript:S6848** - Line 82
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qO

- **javascript:S6848** - Line 86
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qQ

- **javascript:S3358** - Line 152
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qR

- **javascript:S3358** - Line 168
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qS

- **javascript:S3358** - Line 169
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qT

- **javascript:S4624** - Line 169
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnnP78DfsSBSR8qU

### `frontend/src/components/question-bank/BankFilters.jsx`

- **javascript:S3358** - Line 25
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnm-78DfsSBSR8qI

### `frontend/src/components/question-bank/BankQuestionCard.jsx`

- **javascript:S3358** - Line 129
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnH78DfsSBSR8qJ

- **javascript:S6479** - Line 157
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnnH78DfsSBSR8qK

### `frontend/src/components/question-editor/DiagramCropModal.jsx`

- **javascript:S3358** - Line 68
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnci78DfsSBSR8lW

### `frontend/src/components/question-editor/EditorHeader.jsx`

- **javascript:S3358** - Line 19
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWncY78DfsSBSR8lS

- **javascript:S3358** - Line 90
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWncY78DfsSBSR8lT

- **javascript:S3358** - Line 92
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWncY78DfsSBSR8lU

- **javascript:S3358** - Line 99
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWncY78DfsSBSR8lV

### `frontend/src/components/question-editor/EditorPanelResizer.jsx`

- **javascript:S3358** - Line 48
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWndE78DfsSBSR8ld

### `frontend/src/components/question-editor/LatexReferenceModal.jsx`

- **javascript:S6848** - Line 274
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mz

- **javascript:S6848** - Line 278
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8m1

### `frontend/src/components/question-editor/PdfPageFetchModal.jsx`

- **javascript:S3358** - Line 274
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWncr78DfsSBSR8lX

### `frontend/src/components/question-editor/QuestionCard.jsx`

- **javascript:S6848** - Line 25
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWneG78DfsSBSR8nB

- **javascript:S3358** - Line 40
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWneG78DfsSBSR8nC

- **javascript:S3358** - Line 42
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWneG78DfsSBSR8nD

### `frontend/src/components/question-editor/QuestionExplanationCard.jsx`

- **javascript:S6853** - Line 29
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWndj78DfsSBSR8m3

- **javascript:S6848** - Line 65
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWndj78DfsSBSR8m5

### `frontend/src/components/question-editor/QuestionOptionRow.jsx`

- **javascript:S3358** - Line 53
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnd078DfsSBSR8m9

- **javascript:S3358** - Line 180
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnd078DfsSBSR8m-

### `frontend/src/components/question-editor/QuestionOptionsCard.jsx`

- **javascript:S6853** - Line 28
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnaJ78DfsSBSR8lO

- **javascript:S6479** - Line 64
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnaJ78DfsSBSR8lP

### `frontend/src/components/question-editor/QuestionPreviewCard.jsx`

- **javascript:S6479** - Line 112
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnc978DfsSBSR8lb

### `frontend/src/components/question-editor/QuestionScoringFields.jsx`

- **javascript:S6853** - Line 42
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWndr78DfsSBSR8m6

- **javascript:S6853** - Line 63
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWndr78DfsSBSR8m7

### `frontend/src/components/question-editor/QuestionTextCard.jsx`

- **javascript:S6853** - Line 59
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnc078DfsSBSR8lY

- **javascript:S6848** - Line 96
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnc078DfsSBSR8la

### `frontend/src/components/question-editor/QuestionTopicSelect.jsx`

- **javascript:S6853** - Line 11
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWncQ78DfsSBSR8lQ

### `frontend/src/components/review-queue/QueueListView.jsx`

- **javascript:S6853** - Line 45
  - Type: CODE_SMELL
  - Message: A form label must have accessible text.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkV78DfsSBSR8pc

### `frontend/src/components/review-queue/QueueQuestionCard.jsx`

- **javascript:S6479** - Line 108
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnke78DfsSBSR8pd

### `frontend/src/components/settings/PasswordSection.jsx`

- **javascript:S6853** - Line 29
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjr78DfsSBSR8pL

- **javascript:S6853** - Line 61
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjr78DfsSBSR8pM

- **javascript:S6853** - Line 94
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjr78DfsSBSR8pN

- **javascript:S3358** - Line 127
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjr78DfsSBSR8pO

### `frontend/src/components/settings/ProfileSection.jsx`

- **javascript:S6853** - Line 134
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnj078DfsSBSR8pP

- **javascript:S6853** - Line 149
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnj078DfsSBSR8pQ

- **javascript:S6853** - Line 166
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnj078DfsSBSR8pR

- **javascript:S3358** - Line 198
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnj078DfsSBSR8pS

### `frontend/src/components/shared/FormattedTextEditor.jsx`

- **javascript:S3358** - Line 240
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWneS78DfsSBSR8nF

- **javascript:S3358** - Line 405
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWneS78DfsSBSR8nJ

### `frontend/src/components/shared/ImageNode.jsx`

- **javascript:S6819** - Line 139
  - Type: CODE_SMELL
  - Message: Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.
  - Estimated effort: 5min
  - Issue ID: AaBnWneu78DfsSBSR8nR

### `frontend/src/components/shared/MathNode.jsx`

- **javascript:S6819** - Line 206
  - Type: CODE_SMELL
  - Message: Use <input type="button">, <input type="image">, <input type="reset">, <input type="submit">, or <button> instead of the "button" role to ensure accessibility across all devices.
  - Estimated effort: 5min
  - Issue ID: AaBnWnek78DfsSBSR8nP

### `frontend/src/components/shared/QuestionTable.jsx`

- **javascript:S6479** - Line 106
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWne_78DfsSBSR8nV

- **javascript:S6479** - Line 118
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWne_78DfsSBSR8nW

- **javascript:S6479** - Line 162
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWne_78DfsSBSR8nX

- **javascript:S6479** - Line 167
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWne_78DfsSBSR8nY

### `frontend/src/components/shared/UserAvatar.jsx`

- **javascript:S3358** - Line 19
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWne278DfsSBSR8nS

- **javascript:S3358** - Line 21
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWne278DfsSBSR8nT

- **javascript:S3358** - Line 28
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWne278DfsSBSR8nU

### `frontend/src/components/shared-mock/SharedMockIntro.jsx`

- **javascript:S6853** - Line 68
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlj78DfsSBSR8pt

- **javascript:S6853** - Line 56
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlj78DfsSBSR8ps

### `frontend/src/components/students/NewCohortModal.jsx`

- **javascript:S6853** - Line 48
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnku78DfsSBSR8pf

### `frontend/src/components/students/StudentAttemptRow.jsx`

- **javascript:S3358** - Line 18
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnk278DfsSBSR8pg

### `frontend/src/components/students/TopicAccuracyList.jsx`

- **javascript:S3358** - Line 30
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkn78DfsSBSR8pe

### `frontend/src/components/team/InviteMemberModal.jsx`

- **javascript:S6853** - Line 42
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnic78DfsSBSR8oo

- **javascript:S6853** - Line 79
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnic78DfsSBSR8op

- **javascript:S6853** - Line 92
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnic78DfsSBSR8oq

### `frontend/src/components/team/TeamStatsRow.jsx`

- **javascript:S6479** - Line 31
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWniU78DfsSBSR8on

### `frontend/src/components/templates/ApplyTemplateModal.jsx`

- **javascript:S3358** - Line 80
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8pB

- **javascript:S6848** - Line 46
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8o8

- **javascript:S6847** - Line 50
  - Type: CODE_SMELL
  - Message: Non-interactive elements should not be assigned mouse or keyboard event listeners.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8o-

- **javascript:S6853** - Line 63
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8o_

- **javascript:S6853** - Line 75
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8pA

### `frontend/src/components/templates/CreateTemplateModal.jsx`

- **javascript:S6848** - Line 49
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWni178DfsSBSR8o3

- **javascript:S6847** - Line 53
  - Type: CODE_SMELL
  - Message: Non-interactive elements should not be assigned mouse or keyboard event listeners.
  - Estimated effort: 5min
  - Issue ID: AaBnWni178DfsSBSR8o5

- **javascript:S3358** - Line 135
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWni178DfsSBSR8o6

### `frontend/src/components/templates/PopularTemplateCard.jsx`

- **javascript:S6848** - Line 7
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjU78DfsSBSR8pI

### `frontend/src/components/templates/TemplateBasicInfoFields.jsx`

- **javascript:S6853** - Line 22
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjE78DfsSBSR8pC

- **javascript:S6853** - Line 33
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjE78DfsSBSR8pD

- **javascript:S6853** - Line 46
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjE78DfsSBSR8pE

- **javascript:S6853** - Line 61
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjE78DfsSBSR8pF

### `frontend/src/components/templates/TemplateCard.jsx`

- **javascript:S3358** - Line 84
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjM78DfsSBSR8pG

### `frontend/src/components/templates/TemplateColorPicker.jsx`

- **javascript:S6853** - Line 6
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjb78DfsSBSR8pJ

### `frontend/src/components/templates/TemplatePreviewModal.jsx`

- **javascript:S6848** - Line 18
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnil78DfsSBSR8ou

- **javascript:S6479** - Line 101
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnil78DfsSBSR8ow

- **javascript:S6848** - Line 14
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnil78DfsSBSR8os

- **javascript:S6479** - Line 83
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnil78DfsSBSR8ov

### `frontend/src/components/templates/TemplateScoringFields.jsx`

- **javascript:S6853** - Line 20
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnit78DfsSBSR8ox

- **javascript:S6853** - Line 33
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnit78DfsSBSR8oy

- **javascript:S6853** - Line 49
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnit78DfsSBSR8oz

- **javascript:S6853** - Line 61
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnit78DfsSBSR8o0

- **javascript:S6853** - Line 75
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnit78DfsSBSR8o1

### `frontend/src/components/templates/TemplateSectionsList.jsx`

- **javascript:S6853** - Line 15
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnji78DfsSBSR8pK

### `frontend/src/components/ui/skeleton-row.jsx`

- **javascript:S6479** - Line 34
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnoh78DfsSBSR8qs

### `frontend/src/components/ui/skeleton-text.jsx`

- **javascript:S6479** - Line 13
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnoo78DfsSBSR8qt

### `frontend/src/hooks/useTemplateForm.js`

- **javascript:S3358** - Line 95
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrg78DfsSBSR8rX

- **javascript:S3358** - Line 100
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrg78DfsSBSR8rY

### `frontend/src/lib/api.js`

- **javascript:S4624** - Line 383
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnrx78DfsSBSR8rc

- **javascript:S4624** - Line 373
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnrx78DfsSBSR8rb

- **javascript:S3358** - Line 609
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrx78DfsSBSR8rf

- **javascript:S4624** - Line 613
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnrx78DfsSBSR8rg

- **javascript:S3358** - Line 620
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrx78DfsSBSR8rh

- **javascript:S3358** - Line 529
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrx78DfsSBSR8rd

- **javascript:S4624** - Line 533
  - Type: CODE_SMELL
  - Message: Refactor this code to not use nested template literals.
  - Estimated effort: 10min
  - Issue ID: AaBnWnrx78DfsSBSR8re

### `frontend/src/pages/ActiveJobs.jsx`

- **javascript:S3358** - Line 58
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnq378DfsSBSR8rK

- **javascript:S3358** - Line 125
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnq378DfsSBSR8rL

### `frontend/src/pages/AuthPage.jsx`

- **javascript:S6853** - Line 167
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqT78DfsSBSR8rC

- **javascript:S6853** - Line 187
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqT78DfsSBSR8rD

- **javascript:S6853** - Line 205
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqT78DfsSBSR8rE

### `frontend/src/pages/ClustersLibrary.jsx`

- **javascript:S6848** - Line 316
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnp178DfsSBSR8q5

- **javascript:S6848** - Line 258
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnp178DfsSBSR8q3

### `frontend/src/pages/ContactUs.jsx`

- **javascript:S6853** - Line 265
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rN

- **javascript:S6853** - Line 279
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rO

- **javascript:S6853** - Line 294
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rP

- **javascript:S6853** - Line 311
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rQ

- **javascript:S6853** - Line 325
  - Type: CODE_SMELL
  - Message: A form label must be associated with a control.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rR

- **javascript:S6772** - Line 407
  - Type: CODE_SMELL
  - Message: Ambiguous spacing after previous element span
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rS

- **javascript:S6479** - Line 430
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWnrB78DfsSBSR8rT

### `frontend/src/pages/Landing.jsx`

- **javascript:S6479** - Line 435
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWno178DfsSBSR8qu

- **javascript:S6479** - Line 470
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWno178DfsSBSR8qv

### `frontend/src/pages/MyInvitations.jsx`

- **javascript:S1854** - Line 24
  - Type: CODE_SMELL
  - Message: Remove this useless assignment to variable "navigate".
  - Estimated effort: 1min
  - Issue ID: AaBnWnqv78DfsSBSR8rJ

### `frontend/src/pages/MyResults.jsx`

- **javascript:S3358** - Line 73
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnpF78DfsSBSR8qx

### `frontend/src/pages/PublicCatalog.jsx`

- **javascript:S1854** - Line 28
  - Type: CODE_SMELL
  - Message: Remove this useless assignment to variable "navigate".
  - Estimated effort: 1min
  - Issue ID: AaBnWnqI78DfsSBSR8q9

- **javascript:S6848** - Line 95
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqI78DfsSBSR8q_

- **javascript:S6848** - Line 125
  - Type: CODE_SMELL
  - Message: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqI78DfsSBSR8rB

### `frontend/src/pages/QuestionBank.jsx`

- **javascript:S3358** - Line 122
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnpr78DfsSBSR8q1

### `frontend/src/pages/QuestionEditor.jsx`

- **javascript:S3358** - Line 204
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqm78DfsSBSR8rH

### `frontend/src/pages/ReviewQueue.jsx`

- **javascript:S3358** - Line 337
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqd78DfsSBSR8rF

- **javascript:S3358** - Line 339
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqd78DfsSBSR8rG

### `frontend/src/pages/StudentDetail.jsx`

- **javascript:S6479** - Line 82
  - Type: CODE_SMELL
  - Message: Do not use Array index in keys
  - Estimated effort: 5min
  - Issue ID: AaBnWno978DfsSBSR8qw

### `frontend/src/utils/codeIndenter.js`

- **javascript:S7721** - Line 60
  - Type: CODE_SMELL
  - Message: Move function 'countBracesOutsideText' to the outer scope.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsZ78DfsSBSR8rp

- **javascript:S5843** - Line 169
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its complexity from 32 to the 20 allowed.
  - Estimated effort: 32min
  - Issue ID: AaBnWnsZ78DfsSBSR8rt

### `frontend/src/utils/mockTestHelpers.js`

- **javascript:S3358** - Line 284
  - Type: CODE_SMELL
  - Message: Extract this nested ternary operation into an independent statement.
  - Estimated effort: 5min
  - Issue ID: AaBnWnr878DfsSBSR8ri

### `frontend/src/utils/richTextDoc.js`

- **javascript:S5843** - Line 39
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its complexity from 25 to the 20 allowed.
  - Estimated effort: 18min
  - Issue ID: AaBnWns478DfsSBSR8r1

- **javascript:S8786** - Line 349
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWns478DfsSBSR8r5

- **javascript:S2310** - Line 453
  - Type: CODE_SMELL
  - Message: Remove this assignment of "index".
  - Estimated effort: 5min
  - Issue ID: AaBnWns478DfsSBSR8r7

### `frontend/src/utils/richTextDoc.selftest.mjs`

- **javascript:S1854** - Line 55
  - Type: CODE_SMELL
  - Message: Remove this useless assignment to variable "doc".
  - Estimated effort: 1min
  - Issue ID: AaBnWnsP78DfsSBSR8ro

### `frontend/src/utils/textBlocks.js`

- **javascript:S8786** - Line 58
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnsi78DfsSBSR8rx

- **javascript:S8786** - Line 71
  - Type: CODE_SMELL
  - Message: Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.
  - Estimated effort: 20min
  - Issue ID: AaBnWnsi78DfsSBSR8rz

## VULNERABILITY

### `backend/src/routes/mock-tests.routes.js`

- **javascript:S5693** - Line 39
  - Type: VULNERABILITY
  - Message: Make sure the content length limit is safe here.
  - Estimated effort: 5min
  - Issue ID: AaBnWnug78DfsSBSR8sM

### `frontend/src/components/shared/FormattedTextEditor.jsx`

- **javascript:S2245** - Line 323
  - Type: VULNERABILITY
  - Message: Make sure that using this pseudorandom number generator is safe here.
  - Estimated effort: 10min
  - Issue ID: AaBnWneS78DfsSBSR8nI

### `frontend/src/lib/api.js`

- **javascript:S2245** - Line 25
  - Type: VULNERABILITY
  - Message: Make sure that using this pseudorandom number generator is safe here.
  - Estimated effort: 10min
  - Issue ID: AaBnWnrx78DfsSBSR8rZ

### `frontend/src/pages/ContactUs.jsx`

- **javascript:S2245** - Line 124
  - Type: VULNERABILITY
  - Message: Make sure that using this pseudorandom number generator is safe here.
  - Estimated effort: 10min
  - Issue ID: AaBnWnrB78DfsSBSR8rM

---

# MINOR Issues

Total: **249**

## BUG

### `frontend/src/components/app-shell/SubscribedPublishersMenu.jsx`

- **javascript:S1082** - Line 30
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnha78DfsSBSR8oZ

- **javascript:S1082** - Line 60
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnha78DfsSBSR8ob

### `frontend/src/components/catalog/CatalogBrowser.jsx`

- **javascript:S1082** - Line 179
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmT78DfsSBSR8p7

### `frontend/src/components/catalog/CatalogSettingsPanel.jsx`

- **javascript:S1082** - Line 208
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmo78DfsSBSR8qC

- **javascript:S1082** - Line 231
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnmo78DfsSBSR8qE

### `frontend/src/components/cluster/MockTestCard.jsx`

- **javascript:S1082** - Line 61
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWngH78DfsSBSR8nv

### `frontend/src/components/cluster/ShareLinkModal.jsx`

- **javascript:S1082** - Line 44
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWngl78DfsSBSR8n9

- **javascript:S1082** - Line 48
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWngl78DfsSBSR8n_

### `frontend/src/components/dashboard/RecentClustersList.jsx`

- **javascript:S1082** - Line 124
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkM78DfsSBSR8pa

### `frontend/src/components/dashboard/RecentMockTestsList.jsx`

- **javascript:S1082** - Line 72
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnkC78DfsSBSR8pX

### `frontend/src/components/design-system/CardActionMenu.jsx`

- **javascript:S1082** - Line 81
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhS78DfsSBSR8oX

### `frontend/src/components/design-system/RenameModal.jsx`

- **javascript:S1082** - Line 40
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhK78DfsSBSR8oT

- **javascript:S1082** - Line 36
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnhK78DfsSBSR8oR

### `frontend/src/components/question-bank/AddToTestModal.jsx`

- **javascript:S1082** - Line 82
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qN

- **javascript:S1082** - Line 86
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnP78DfsSBSR8qP

### `frontend/src/components/question-editor/LatexReferenceModal.jsx`

- **javascript:S1082** - Line 274
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8my

- **javascript:S1082** - Line 278
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8m0

### `frontend/src/components/question-editor/QuestionCard.jsx`

- **javascript:S1082** - Line 25
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWneG78DfsSBSR8nA

### `frontend/src/components/question-editor/QuestionExplanationCard.jsx`

- **javascript:S1082** - Line 65
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWndj78DfsSBSR8m4

### `frontend/src/components/question-editor/QuestionTextCard.jsx`

- **javascript:S1082** - Line 96
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnc078DfsSBSR8lZ

### `frontend/src/components/templates/ApplyTemplateModal.jsx`

- **javascript:S1082** - Line 46
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8o7

- **javascript:S1082** - Line 50
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWni978DfsSBSR8o9

### `frontend/src/components/templates/CreateTemplateModal.jsx`

- **javascript:S1082** - Line 49
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWni178DfsSBSR8o2

- **javascript:S1082** - Line 53
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWni178DfsSBSR8o4

### `frontend/src/components/templates/PopularTemplateCard.jsx`

- **javascript:S1082** - Line 7
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnjU78DfsSBSR8pH

### `frontend/src/components/templates/TemplatePreviewModal.jsx`

- **javascript:S1082** - Line 18
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnil78DfsSBSR8ot

- **javascript:S1082** - Line 14
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnil78DfsSBSR8or

### `frontend/src/pages/ClustersLibrary.jsx`

- **javascript:S1082** - Line 316
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnp178DfsSBSR8q4

- **javascript:S1082** - Line 258
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnp178DfsSBSR8q2

### `frontend/src/pages/PublicCatalog.jsx`

- **javascript:S1082** - Line 95
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqI78DfsSBSR8q-

- **javascript:S1082** - Line 125
  - Type: BUG
  - Message: Visible, non-interactive elements with click handlers must have at least one keyboard listener.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqI78DfsSBSR8rA

## CODE_SMELL

### `backend/migrations/001_initial_schema.sql`

- **plsql:OrderByExplicitAscCheck** - Line 230
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1y78DfsSBSR8uY

- **plsql:OrderByExplicitAscCheck** - Line 230
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1y78DfsSBSR8uZ

### `backend/migrations/002_rename_playable_questions_view.sql`

- **plsql:OrderByExplicitAscCheck** - Line 27
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0x78DfsSBSR8uH

- **plsql:OrderByExplicitAscCheck** - Line 27
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0x78DfsSBSR8uI

### `backend/migrations/008_playable_questions_add_id.sql`

- **plsql:OrderByExplicitAscCheck** - Line 27
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1p78DfsSBSR8uW

- **plsql:OrderByExplicitAscCheck** - Line 27
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1p78DfsSBSR8uX

### `backend/migrations/013_playable_questions_code_fields.sql`

- **plsql:OrderByExplicitAscCheck** - Line 37
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn2L78DfsSBSR8ul

- **plsql:OrderByExplicitAscCheck** - Line 37
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn2L78DfsSBSR8um

### `backend/migrations/017_question_code_snippet.sql`

- **plsql:OrderByExplicitAscCheck** - Line 48
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0578DfsSBSR8uJ

- **plsql:OrderByExplicitAscCheck** - Line 48
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0578DfsSBSR8uK

### `backend/migrations/027_exclude_rejected_questions.sql`

- **plsql:OrderByExplicitAscCheck** - Line 53
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1I78DfsSBSR8uN

- **plsql:OrderByExplicitAscCheck** - Line 53
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1I78DfsSBSR8uO

### `backend/migrations/028_playable_questions_subtopic_passage.sql`

- **plsql:OrderByExplicitAscCheck** - Line 38
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0X78DfsSBSR8t_

- **plsql:OrderByExplicitAscCheck** - Line 38
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0X78DfsSBSR8uA

### `backend/migrations/030_shared_question_content.sql`

- **plsql:OrderByExplicitAscCheck** - Line 381
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0p78DfsSBSR8uE

- **plsql:OrderByExplicitAscCheck** - Line 381
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0p78DfsSBSR8uF

### `backend/migrations/031_drop_question_code_fields.sql`

- **plsql:OrderByExplicitAscCheck** - Line 62
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn2T78DfsSBSR8un

- **plsql:OrderByExplicitAscCheck** - Line 62
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn2T78DfsSBSR8uo

### `backend/migrations/032_question_content_options.sql`

- **plsql:OrderByExplicitAscCheck** - Line 78
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1B78DfsSBSR8uL

- **plsql:OrderByExplicitAscCheck** - Line 78
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1B78DfsSBSR8uM

### `backend/migrations/043_playable_questions_marks.sql`

- **plsql:OrderByExplicitAscCheck** - Line 25
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1g78DfsSBSR8uU

- **plsql:OrderByExplicitAscCheck** - Line 25
  - Type: CODE_SMELL
  - Message: Add ASC in order to make the order explicit.
  - Estimated effort: 5min
  - Issue ID: AaBnWn1g78DfsSBSR8uV

### `backend/src/controllers/shared.controller.js`

- **javascript:S7751** - Line 39
  - Type: CODE_SMELL
  - Message: Prefer `Array#flat()` over `[].concat()` to flatten an array.
  - Estimated effort: 5min
  - Issue ID: AaBnWnuV78DfsSBSR8sL

### `backend/src/db/backfill-math-formatting.js`

- **javascript:S6353** - Line 77
  - Type: CODE_SMELL
  - Message: Use concise character class syntax '\d' instead of '[0-9]'.
  - Estimated effort: 5min
  - Issue ID: AaBnWntl78DfsSBSR8sA

- **javascript:S6353** - Line 81
  - Type: CODE_SMELL
  - Message: Use concise character class syntax '\d' instead of '[0-9]'.
  - Estimated effort: 5min
  - Issue ID: AaBnWntl78DfsSBSR8sB

### `backend/src/db/pool.js`

- **javascript:S7781** - Line 46
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWntc78DfsSBSR8r_

### `backend/src/lib/code-indenter.js`

- **javascript:S7755** - Line 78
  - Type: CODE_SMELL
  - Message: Prefer `.at(â¦)` over `[â¦.length - index]`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnxL78DfsSBSR8tK

- **javascript:S7755** - Line 81
  - Type: CODE_SMELL
  - Message: Prefer `.at(â¦)` over `[â¦.length - index]`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnxL78DfsSBSR8tL

### `backend/src/lib/math-validator.js`

- **javascript:S7780** - Line 25
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnxD78DfsSBSR8tF

- **javascript:S7780** - Line 25
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnxD78DfsSBSR8tG

- **javascript:S7780** - Line 28
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnxD78DfsSBSR8tH

- **javascript:S7780** - Line 28
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnxD78DfsSBSR8tI

### `backend/src/lib/math-validator.selftest.js`

- **javascript:S7780** - Line 16
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s1

- **javascript:S7780** - Line 17
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s2

- **javascript:S7780** - Line 22
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s3

- **javascript:S7780** - Line 28
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s4

- **javascript:S7780** - Line 31
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s5

- **javascript:S7780** - Line 33
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s6

- **javascript:S7780** - Line 34
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s7

- **javascript:S7780** - Line 39
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s8

- **javascript:S7780** - Line 44
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s9

- **javascript:S7780** - Line 54
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s-

- **javascript:S7780** - Line 77
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8s_

- **javascript:S7780** - Line 79
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnww78DfsSBSR8tA

### `backend/src/lib/pdf-export/browser.js`

- **javascript:S6582** - Line 22
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwM78DfsSBSR8sh

### `backend/src/lib/pdf-export/math-html.js`

- **javascript:S6594** - Line 83
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sz

- **javascript:S7781** - Line 177
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8s0

- **javascript:S7780** - Line 22
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sq

- **javascript:S7780** - Line 22
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sr

- **javascript:S7780** - Line 25
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8ss

- **javascript:S7780** - Line 25
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8st

- **javascript:S7781** - Line 58
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8su

- **javascript:S7781** - Line 59
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sv

- **javascript:S7781** - Line 60
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sw

- **javascript:S7781** - Line 61
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sx

- **javascript:S7781** - Line 62
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwn78DfsSBSR8sy

### `backend/src/lib/pdf-export/render-html.js`

- **javascript:S7758** - Line 98
  - Type: CODE_SMELL
  - Message: Prefer `String.fromCodePoint()` over `String.fromCharCode()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwf78DfsSBSR8sn

- **javascript:S6582** - Line 106
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwf78DfsSBSR8so

- **javascript:S7758** - Line 118
  - Type: CODE_SMELL
  - Message: Prefer `String.fromCodePoint()` over `String.fromCharCode()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwf78DfsSBSR8sp

### `backend/src/lib/pdf-export/table-html.js`

- **javascript:S1128** - Line 1
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'escapeHtml'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnwC78DfsSBSR8se

- **javascript:S7781** - Line 52
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwC78DfsSBSR8sg

### `backend/src/lib/pdf-export/text-blocks.js`

- **javascript:S6594** - Line 46
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwU78DfsSBSR8sj

- **javascript:S6594** - Line 59
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwU78DfsSBSR8sl

- **javascript:S4138** - Line 30
  - Type: CODE_SMELL
  - Message: Expected a `for-of` loop instead of a `for` loop with this simple iteration.
  - Estimated effort: 5min
  - Issue ID: AaBnWnwU78DfsSBSR8si

### `backend/src/repositories/attempts.repository.js`

- **javascript:S6582** - Line 51
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnyG78DfsSBSR8tU

- **javascript:S6582** - Line 297
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnyG78DfsSBSR8tV

- **javascript:S6582** - Line 324
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnyG78DfsSBSR8tW

- **javascript:S6582** - Line 420
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnyG78DfsSBSR8tX

- **javascript:S6582** - Line 422
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnyG78DfsSBSR8tY

### `backend/src/repositories/mock-tests.repository.js`

- **javascript:S6582** - Line 345
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnyS78DfsSBSR8tZ

### `backend/src/repositories/review-queue.repository.js`

- **javascript:S6582** - Line 111
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnx578DfsSBSR8tT

### `backend/src/services/attempts.service.js`

- **javascript:S6582** - Line 174
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnv578DfsSBSR8sd

- **javascript:S6582** - Line 148
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnv578DfsSBSR8sc

### `backend/src/services/mock-tests.service.js`

- **javascript:S6582** - Line 666
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnvt78DfsSBSR8sX

### `backend/src/services/questions.service.js`

- **javascript:S6582** - Line 154
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnvI78DfsSBSR8sU

### `backend/src/services/review-queue.service.js`

- **javascript:S7776** - Line 4
  - Type: CODE_SMELL
  - Message: `VALID_SORTS` should be a `Set`, and use `VALID_SORTS.has()` to check existence or non-existence.
  - Estimated effort: 5min
  - Issue ID: AaBnWnuy78DfsSBSR8sO

### `backend/src/services/shared.service.js`

- **javascript:S6582** - Line 113
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnvR78DfsSBSR8sV

### `backend/src/services/students.service.js`

- **javascript:S6582** - Line 112
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnu878DfsSBSR8sQ

- **javascript:S6582** - Line 132
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnu878DfsSBSR8sR

### `backend/worker/ai/provider.py`

- **python:S7500** - Line 793
  - Type: CODE_SMELL
  - Message: Replace this comprehension with passing the iterable to the dict constructor call
  - Estimated effort: 5min
  - Issue ID: AaBnWnyo78DfsSBSR8te

- **python:S7500** - Line 614
  - Type: CODE_SMELL
  - Message: Replace this comprehension with passing the iterable to the dict constructor call
  - Estimated effort: 5min
  - Issue ID: AaBnWnyo78DfsSBSR8td

### `backend/worker/db.py`

- **python:S7508** - Line 479
  - Type: CODE_SMELL
  - Message: Remove this redundant call.
  - Estimated effort: 5min
  - Issue ID: AaBnWn0O78DfsSBSR8t-

### `backend/worker/reconcile.py`

- **python:S1481** - Line 105
  - Type: CODE_SMELL
  - Message: Remove the unused local variable "ai_has_same".
  - Estimated effort: 5min
  - Issue ID: AaBnWnzW78DfsSBSR8ts

### `frontend/src/components/analytics/CustomTooltip.jsx`

- **javascript:S6582** - Line 2
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnh178DfsSBSR8of

### `frontend/src/components/catalog/CatalogBrowser.jsx`

- **javascript:S1128** - Line 4
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'UserCheck'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnmT78DfsSBSR8p2

### `frontend/src/components/cluster/ProcessingTab.jsx`

- **javascript:S1128** - Line 2
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'AlertCircle'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnfX78DfsSBSR8nb

- **javascript:S1128** - Line 3
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'AlertTriangle'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnfX78DfsSBSR8nc

### `frontend/src/components/dashboard/RecentMockTestsList.jsx`

- **javascript:S3863** - Line 1
  - Type: CODE_SMELL
  - Message: 'react-router-dom' imported multiple times.
  - Estimated effort: 1min
  - Issue ID: AaBnWnkC78DfsSBSR8pU

- **javascript:S3863** - Line 6
  - Type: CODE_SMELL
  - Message: 'react-router-dom' imported multiple times.
  - Estimated effort: 1min
  - Issue ID: AaBnWnkC78DfsSBSR8pV

### `frontend/src/components/hero/PDFScene.jsx`

- **javascript:S1128** - Line 5
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'EXPO'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnmC78DfsSBSR8py

### `frontend/src/components/HeroAnimation.jsx`

- **javascript:S1128** - Line 8
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'SPRING'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnoY78DfsSBSR8qp

### `frontend/src/components/mock-session/SessionQuestionView.jsx`

- **javascript:S7758** - Line 103
  - Type: CODE_SMELL
  - Message: Prefer `String.fromCodePoint()` over `String.fromCharCode()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnf78DfsSBSR8qZ

### `frontend/src/components/my-results/AttemptCard.jsx`

- **javascript:S6582** - Line 48
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnlU78DfsSBSR8pn

### `frontend/src/components/question-bank/BankQuestionCard.jsx`

- **javascript:S7758** - Line 164
  - Type: CODE_SMELL
  - Message: Prefer `String.fromCodePoint()` over `String.fromCharCode()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnnH78DfsSBSR8qL

### `frontend/src/components/question-editor/EditorSidebar.jsx`

- **javascript:S1128** - Line 1
  - Type: CODE_SMELL
  - Message: Remove this unused import of 'MarksBadge'.
  - Estimated effort: 1min
  - Issue ID: AaBnWnd-78DfsSBSR8m_

### `frontend/src/components/question-editor/LatexReferenceModal.jsx`

- **javascript:S7780** - Line 34
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8le

- **javascript:S7780** - Line 35
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lf

- **javascript:S7780** - Line 36
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lg

- **javascript:S7780** - Line 37
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lh

- **javascript:S7780** - Line 38
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8li

- **javascript:S7780** - Line 47
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lj

- **javascript:S7780** - Line 48
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lk

- **javascript:S7780** - Line 49
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ll

- **javascript:S7780** - Line 71
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lm

- **javascript:S7780** - Line 72
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ln

- **javascript:S7780** - Line 73
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lo

- **javascript:S7780** - Line 74
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lp

- **javascript:S7780** - Line 75
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lq

- **javascript:S7780** - Line 76
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lr

- **javascript:S7780** - Line 77
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ls

- **javascript:S7780** - Line 78
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lt

- **javascript:S7780** - Line 79
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lu

- **javascript:S7780** - Line 80
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lv

- **javascript:S7780** - Line 81
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lw

- **javascript:S7780** - Line 82
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lx

- **javascript:S7780** - Line 83
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ly

- **javascript:S7780** - Line 84
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8lz

- **javascript:S7780** - Line 93
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l0

- **javascript:S7780** - Line 94
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l1

- **javascript:S7780** - Line 95
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l2

- **javascript:S7780** - Line 96
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l3

- **javascript:S7780** - Line 105
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l4

- **javascript:S7780** - Line 106
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l5

- **javascript:S7780** - Line 107
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l6

- **javascript:S7780** - Line 108
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l7

- **javascript:S7780** - Line 109
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l8

- **javascript:S7780** - Line 110
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l9

- **javascript:S7780** - Line 111
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l-

- **javascript:S7780** - Line 120
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8l_

- **javascript:S7780** - Line 121
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mA

- **javascript:S7780** - Line 122
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mB

- **javascript:S7780** - Line 123
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mC

- **javascript:S7780** - Line 124
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mD

- **javascript:S7780** - Line 125
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mE

- **javascript:S7780** - Line 126
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mF

- **javascript:S7780** - Line 127
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mG

- **javascript:S7780** - Line 128
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mH

- **javascript:S7780** - Line 137
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mI

- **javascript:S7780** - Line 138
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mJ

- **javascript:S7780** - Line 139
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mK

- **javascript:S7780** - Line 140
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mL

- **javascript:S7780** - Line 141
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mM

- **javascript:S7780** - Line 151
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mN

- **javascript:S7780** - Line 152
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mO

- **javascript:S7780** - Line 153
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mP

- **javascript:S7780** - Line 154
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mQ

- **javascript:S7780** - Line 155
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mR

- **javascript:S7780** - Line 156
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mS

- **javascript:S7780** - Line 165
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mT

- **javascript:S7780** - Line 166
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mU

- **javascript:S7780** - Line 167
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mV

- **javascript:S7780** - Line 168
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mW

- **javascript:S7780** - Line 169
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mX

- **javascript:S7780** - Line 170
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mY

- **javascript:S7780** - Line 171
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mZ

- **javascript:S7780** - Line 172
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ma

- **javascript:S7780** - Line 173
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mb

- **javascript:S7780** - Line 174
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mc

- **javascript:S7780** - Line 175
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8md

- **javascript:S7780** - Line 176
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8me

- **javascript:S7780** - Line 177
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mf

- **javascript:S7780** - Line 178
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mg

- **javascript:S7780** - Line 188
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mh

- **javascript:S7780** - Line 192
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mi

- **javascript:S7780** - Line 195
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mj

- **javascript:S7780** - Line 196
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mk

- **javascript:S7780** - Line 205
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ml

- **javascript:S7780** - Line 206
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mm

- **javascript:S7780** - Line 207
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mn

- **javascript:S7780** - Line 208
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mo

- **javascript:S7780** - Line 209
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mp

- **javascript:S7780** - Line 218
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mq

- **javascript:S7780** - Line 219
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mr

- **javascript:S7780** - Line 220
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8ms

- **javascript:S7780** - Line 221
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mt

- **javascript:S7780** - Line 222
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mu

- **javascript:S7780** - Line 231
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mv

- **javascript:S7780** - Line 232
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mw

- **javascript:S7780** - Line 233
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWndP78DfsSBSR8mx

### `frontend/src/components/question-editor/QuestionOptionRow.jsx`

- **javascript:S7758** - Line 41
  - Type: CODE_SMELL
  - Message: Prefer `String.fromCodePoint()` over `String.fromCharCode()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnd078DfsSBSR8m8

### `frontend/src/components/question-editor/QuestionPreviewCard.jsx`

- **javascript:S7758** - Line 119
  - Type: CODE_SMELL
  - Message: Prefer `String.fromCodePoint()` over `String.fromCharCode()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnc978DfsSBSR8lc

### `frontend/src/components/question-editor/RichTextToolbar.jsx`

- **javascript:S7765** - Line 140
  - Type: CODE_SMELL
  - Message: Use `.includes()`, rather than `.indexOf()`, when checking for existence.
  - Estimated effort: 5min
  - Issue ID: AaBnWndb78DfsSBSR8m2

### `frontend/src/components/shared/FormattedTextEditor.jsx`

- **javascript:S6582** - Line 315
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWneS78DfsSBSR8nH

- **javascript:S6582** - Line 298
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWneS78DfsSBSR8nG

### `frontend/src/components/shared/MathText.jsx`

- **javascript:S6594** - Line 72
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWneb78DfsSBSR8nO

- **javascript:S7780** - Line 25
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWneb78DfsSBSR8nK

- **javascript:S7780** - Line 25
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWneb78DfsSBSR8nL

- **javascript:S7780** - Line 28
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWneb78DfsSBSR8nM

- **javascript:S7780** - Line 28
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWneb78DfsSBSR8nN

### `frontend/src/hooks/useMyResults.js`

- **javascript:S6582** - Line 5
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrX78DfsSBSR8rV

### `frontend/src/hooks/useQuestionEditor.js`

- **javascript:S6582** - Line 155
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrP78DfsSBSR8rU

### `frontend/src/hooks/useTemplateForm.js`

- **javascript:S6644** - Line 93
  - Type: CODE_SMELL
  - Message: Unnecessary use of conditional expression for default assignment.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrg78DfsSBSR8rW

### `frontend/src/lib/api.js`

- **javascript:S7744** - Line 62
  - Type: CODE_SMELL
  - Message: The empty object is useless.
  - Estimated effort: 5min
  - Issue ID: AaBnWnrx78DfsSBSR8ra

### `frontend/src/pages/MockSession.jsx`

- **javascript:S7758** - Line 105
  - Type: CODE_SMELL
  - Message: Prefer `String#codePointAt()` over `String#charCodeAt()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnpZ78DfsSBSR8qz

- **javascript:S6582** - Line 106
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnpZ78DfsSBSR8q0

### `frontend/src/pages/MyInvitations.jsx`

- **javascript:S1481** - Line 24
  - Type: CODE_SMELL
  - Message: Remove the declaration of the unused 'navigate' variable.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqv78DfsSBSR8rI

### `frontend/src/pages/PublicCatalog.jsx`

- **javascript:S1481** - Line 28
  - Type: CODE_SMELL
  - Message: Remove the declaration of the unused 'navigate' variable.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqI78DfsSBSR8q8

### `frontend/src/pages/SharedMock.jsx`

- **javascript:S7758** - Line 105
  - Type: CODE_SMELL
  - Message: Prefer `String#codePointAt()` over `String#charCodeAt()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqA78DfsSBSR8q6

- **javascript:S6582** - Line 106
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWnqA78DfsSBSR8q7

### `frontend/src/utils/codeIndenter.js`

- **javascript:S7755** - Line 147
  - Type: CODE_SMELL
  - Message: Prefer `.at(â¦)` over `[â¦.length - index]`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsZ78DfsSBSR8rr

- **javascript:S7755** - Line 150
  - Type: CODE_SMELL
  - Message: Prefer `.at(â¦)` over `[â¦.length - index]`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsZ78DfsSBSR8rs

### `frontend/src/utils/questionEditorHelpers.js`

- **javascript:S6353** - Line 156
  - Type: CODE_SMELL
  - Message: Use concise character class syntax '\d' instead of '[0-9]'.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsG78DfsSBSR8rj

- **javascript:S6353** - Line 160
  - Type: CODE_SMELL
  - Message: Use concise character class syntax '\d' instead of '[0-9]'.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsG78DfsSBSR8rk

### `frontend/src/utils/richTextDoc.js`

- **javascript:S6582** - Line 165
  - Type: CODE_SMELL
  - Message: Prefer using an optional chain expression instead, as it's more concise and easier to read.
  - Estimated effort: 5min
  - Issue ID: AaBnWns478DfsSBSR8r3

- **javascript:S7781** - Line 150
  - Type: CODE_SMELL
  - Message: Prefer `String#replaceAll()` over `String#replace()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWns478DfsSBSR8r2

- **javascript:S7780** - Line 244
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWns478DfsSBSR8r4

- **javascript:S6594** - Line 432
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWns478DfsSBSR8r6

### `frontend/src/utils/richTextDoc.selftest.mjs`

- **javascript:S7780** - Line 23
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsP78DfsSBSR8rm

- **javascript:S7780** - Line 33
  - Type: CODE_SMELL
  - Message: `String.raw` should be used to avoid escaping `\`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsP78DfsSBSR8rn

### `frontend/src/utils/teamHelpers.js`

- **javascript:S7758** - Line 50
  - Type: CODE_SMELL
  - Message: Prefer `String#codePointAt()` over `String#charCodeAt()`.
  - Estimated effort: 5min
  - Issue ID: AaBnWnst78DfsSBSR8r0

### `frontend/src/utils/textBlocks.js`

- **javascript:S6594** - Line 58
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsi78DfsSBSR8rw

- **javascript:S6594** - Line 71
  - Type: CODE_SMELL
  - Message: Use the "RegExp.exec()" method instead.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsi78DfsSBSR8ry

- **javascript:S4138** - Line 42
  - Type: CODE_SMELL
  - Message: Expected a `for-of` loop instead of a `for` loop with this simple iteration.
  - Estimated effort: 5min
  - Issue ID: AaBnWnsi78DfsSBSR8rv

## VULNERABILITY

### `backend/src/lib/pdf-storage.js`

- **jssecurity:S5145** - Line 231
  - Type: VULNERABILITY
  - Message: Change this code to not log user-controlled data.
  - Estimated effort: 30min
  - Issue ID: AaBnWnxV78DfsSBSR8tO

- **jssecurity:S5145** - Line 238
  - Type: VULNERABILITY
  - Message: Change this code to not log user-controlled data.
  - Estimated effort: 30min
  - Issue ID: AaBnWnxV78DfsSBSR8tR

- **jssecurity:S5145** - Line 172
  - Type: VULNERABILITY
  - Message: Change this code to not log user-controlled data.
  - Estimated effort: 30min
  - Issue ID: AaBnWnxV78DfsSBSR8tQ

- **jssecurity:S5145** - Line 142
  - Type: VULNERABILITY
  - Message: Change this code to not log user-controlled data.
  - Estimated effort: 30min
  - Issue ID: AaBnWnxV78DfsSBSR8tP

### `backend/worker/http_server.py`

- **python:S5332** - Line 314
  - Type: VULNERABILITY
  - Message: Using HTTP protocol is insecure. Use HTTPS instead.
  - Estimated effort: 30min
  - Issue ID: AaBnWnz378DfsSBSR8t6

---

# Instructions for AI Coding Agents

Use this report as a list of SonarQube findings to investigate.

For each issue:

1. Locate the specified file and line.
2. Read the surrounding code.
3. Understand the SonarQube rule.
4. Determine whether the finding is genuine or a false positive.
5. Fix genuine issues while preserving existing behavior.
6. Do not suppress or disable rules simply to remove the finding.
7. Do not perform unrelated refactoring.
8. Run relevant tests, type checks, and linters.
9. Verify that the original SonarQube issue is resolved.

Priority order:

1. BLOCKER
2. CRITICAL
3. MAJOR
4. MINOR
5. INFO

