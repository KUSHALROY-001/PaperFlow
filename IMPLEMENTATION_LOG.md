# PaperFlow Redesign Implementation Log

## 2026-08-27 - Fix: replaced diagram still showing the previous image

### Objective
After a successful Replace Image (or crop) the editor kept rendering the old PNG even though the upload finished and the loader went away.

### Cause
Diagrams are stored under a stable Cloudinary `public_id` (`paperflow/<workspace>/<mockTest>/diagrams/<questionId>`). Replace and crop overwrite that id in place, so `diagramUrl` kept pointing at the same delivery URL. Cloudinary's CDN and the browser both cache on that URL, and the API 302 also sent `Cache-Control: private, max-age=86400`. The new bytes were in Cloudinary; every `<img>` still received the cached previous PNG.

### Fix
- Version every diagram delivery URL from `question_assets.created_at` (`?v=<ms>` on `/api/questions/:id/diagram`, and Cloudinary `/v<ms>/`).
- Replace already DELETE+INSERTs a new row (new `created_at`). Crop now calls `touchAsset` so `created_at` bumps too.
- Upload with `overwrite: true, invalidate: true`. Stop caching the 302.
- Remount the preview `<img>` when `diagramUrl` changes.

No database migration.

### Affected Files
- `backend/src/lib/diagram-cache-version.js` (new)
- `backend/src/lib/cloudinary-storage.js`
- `backend/src/lib/cloudinary-storage.selftest.js` (new)
- `backend/src/repositories/question-assets.repository.js`
- `backend/src/controllers/question-assets.controller.js`
- `backend/src/services/question-assets.service.js`
- `backend/worker/storage.py`
- `frontend/src/components/shared/QuestionContent.jsx`
- `frontend/src/components/question-editor/DiagramUploadControl.jsx`
- `frontend/src/components/question-editor/DiagramCropModal.jsx`
- `frontend/src/components/question-editor/QuestionPreviewCard.jsx`

### Verification
- Passed: `node src/lib/cloudinary-storage.selftest.js`
- Passed: `node --check` on every edited backend module

---

## 2026-07-23 - Milestone 1: Design System Foundation

### Objective
Establish the shared foundation from `PaperFlow-Product-Redesign.md` before implementing page-level redesigns.

### Completed
- Replaced the active global theme with the Academic Teal token set.
- Added Geist Sans and Geist Mono typography with system fallbacks.
- Defined light and dark theme variables for background, surfaces, text, borders, primary, semantic states, disabled states, selection, radius, spacing, and motion.
- Updated shared primitive defaults for buttons, badges, cards, and inputs to remove default shadows and align with the border-first product language.
- Added reusable PaperFlow design-system primitives:
  - `StatusBadge`
  - `ConfidenceBadge`
  - `StatTile`
  - `EmptyState`
  - `Skeleton`
  - `ProgressStepper`
  - `JobCard`
  - `OptionSelector`
  - `ConfirmDialog`
  - `DataTable`
- Added `paperFlowTokens` as a documented runtime token reference for future non-CSS usage.
- Neutralized stale `App.css` so `index.css` remains the single active source of design truth.
- Preserved legacy class names such as `gradient-violet`, `gradient-hero`, `gradient-card`, and `card-lavender` as temporary teal-compatible aliases to keep existing pages functional during incremental migration.

### Affected Files
- `frontend/src/index.css`
- `frontend/src/App.css`
- `frontend/src/components/ui/button.jsx`
- `frontend/src/components/ui/badge.jsx`
- `frontend/src/components/ui/card.jsx`
- `frontend/src/components/ui/input.jsx`
- `frontend/src/lib/design-tokens.js`
- `frontend/src/components/design-system/StatusBadge.jsx`
- `frontend/src/components/design-system/ConfidenceBadge.jsx`
- `frontend/src/components/design-system/StatTile.jsx`
- `frontend/src/components/design-system/EmptyState.jsx`
- `frontend/src/components/design-system/Skeleton.jsx`
- `frontend/src/components/design-system/ProgressStepper.jsx`
- `frontend/src/components/design-system/JobCard.jsx`
- `frontend/src/components/design-system/OptionSelector.jsx`
- `frontend/src/components/design-system/ConfirmDialog.jsx`
- `frontend/src/components/design-system/DataTable.jsx`
- `frontend/src/components/design-system/index.js`

### Verification
- Passed: `npm run build`
- Blocked: visual screenshot capture. The in-app browser rejected navigation to `http://127.0.0.1:5174/` due to its browser security policy, so no screenshot was captured for this milestone.

### Remaining Work
- Migrate `AppShell` to the new information architecture.
- Replace page-level violet utility classes with the new primitives.
- Implement the New Mock Test flow after the shell foundation is complete.
- Rework Dashboard, processing monitor, review/editor, exam session, analytics, settings, team, templates, and landing pages in later milestones.
