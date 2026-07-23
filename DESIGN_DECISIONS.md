# PaperFlow Redesign Design Decisions

## 2026-07-23 - Milestone 1: Design System Foundation

### Source Of Truth
The redesign document is treated as the product specification. The foundation now follows the Academic Teal direction rather than the previous violet/Base44 visual language.

### Architectural Choices
- `frontend/src/index.css` is the single active source for global tokens, typography, motion, and compatibility utility classes.
- `frontend/src/App.css` is intentionally token-free to avoid a second competing theme source.
- Existing Radix/shadcn-style primitives are preserved and retuned instead of replaced, because they already provide accessible behavior and are used throughout the app.
- New PaperFlow-specific primitives live in `frontend/src/components/design-system` to separate product semantics from low-level UI wrappers.
- The legacy class names remain temporarily mapped to teal-compatible styles so page migrations can happen incrementally without breaking existing screens.

### Inferred Decisions
- Geist is loaded from Google Fonts with safe system fallbacks because the spec requires Geist but the project does not currently vendor font files.
- The old `gradient-violet` class now resolves to a solid teal primary instead of a gradient, preserving compatibility while enforcing the spec's "retire violet gradient" rule.
- The old `card-lavender` class now resolves to a border-first PaperFlow surface with no shadow.
- Dark-mode tokens are implemented even before page migration so the navbar and shell can adopt dark/light behavior in the next milestone.
- `OptionSelector` is included in the foundation now because the exam screen requires an OMR-bubble interaction pattern and should not invent its own styling later.

### Non-Goals For This Milestone
- No page layout was redesigned.
- No backend API behavior was changed.
- No working data-fetching logic was rewritten.
- Existing page-level violet classes are not fully removed yet; they will be migrated page by page.

### Verification Notes
- Production build verification passed with `npm run build`.
- Screenshot verification is pending because the in-app browser blocked the local Vite URL. No alternate browser workaround was used.

### Remaining Design Questions
- Whether to vendor Geist font files later for offline-perfect typography.
- Whether full attempt persistence requires new backend endpoints before the Mock Session redesign can be considered complete.
- Whether single-job retry requires a dedicated backend endpoint or should continue using mock-test reprocessing as the fallback.
