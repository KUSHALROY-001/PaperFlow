# Engineering Standards for PaperFlow

This document is the mandatory engineering guide for every human developer and every AI coding agent working in this repository.

It is derived from the current architecture, the existing technical debt, and the target direction of the product: a feature-first React frontend built with Vite, React Router, TanStack Query, Tailwind, and a centralized design-system foundation.

## 1. Engineering philosophy

### Rule 1: Prefer feature-first architecture over page-first implementation

- Why: The current frontend is visually strong but still too page-centric. Large route files such as the mock-test workspace and question editor are carrying too much logic. Feature-first structure reduces rework and makes the app easier to grow.
- Good example:
  - A new cluster workflow is implemented under `src/features/clusters/` with `components/`, `hooks/`, `services/`, and `utils/`.
  - The route page only wires the feature into navigation.
- Bad example:
  - A new “edit cluster” experience is implemented directly inside `src/pages/ClusterWorkspace.jsx` with local state, mutations, and UI all in one file.
- Exceptions:
  - Very small one-off screens may stay in `src/pages/` temporarily, but they must not grow beyond the size limits below.

### Rule 2: Treat design-system primitives as the default, not the exception

- Why: The product already has a shared visual language and a significant amount of repeated UI. Recreating cards, badges, loaders, empty states, and form patterns in every page causes drift.
- Good example:
  - A new dashboard stat uses `StatTile`, `EmptyState`, and `StatusBadge` from `src/components/design-system`.
- Bad example:
  - A new page invents a new card layout, custom badge, and spinner with hand-written Tailwind classes instead of reusing the existing primitives.
- Exceptions:
  - A new primitive may be created only when the existing design-system does not support the required product semantics.

### Rule 3: Refactor before adding new surface area

- Why: The codebase already shows architectural drift in the page layer. Every new feature must improve the structure instead of adding another monolithic page.
- Good example:
  - A new “bulk actions” section is extracted into a small component and a hook before being integrated into the page.
- Bad example:
  - A new page is added that duplicates another page’s layout and logic because the existing code is “too messy” to reuse.
- Exceptions:
  - Prototype or demo routes may temporarily live as isolated files if they are explicitly marked as temporary.

---

## 2. Folder architecture

### Rule 4: Keep route pages thin and compositional

- Why: Pages should act as entry points, not as the main implementation location for business logic.
- Good example:
  - `src/pages/ClusterWorkspace.jsx` only resolves route params, renders the feature shell, and passes data into feature components.
- Bad example:
  - `src/pages/MockTestWorkspace.jsx` contains query logic, mutation handlers, tab state, local helper functions, and the full UI tree in one file.
- Exceptions:
  - Small pages may contain local layout-only state if they are under 150 lines.

### Rule 5: New feature code belongs under `src/features/<feature>/`

- Why: This repository needs to move away from page-centric organization.
- Good example:
  - `src/features/clusters/components/ClusterHeader.jsx`
  - `src/features/clusters/hooks/useClusterDetails.js`
  - `src/features/clusters/services/clusterService.js`
- Bad example:
  - Creating a new feature directly inside `src/pages/` or `src/components/` with no feature boundary.
- Exceptions:
  - Existing shared UI primitives remain under `src/components/` and `src/components/design-system/`.

### Rule 6: Shared primitives stay in `src/components/`

- Why: The app already has a strong UI layer that should remain reusable and stable.
- Good example:
  - `src/components/design-system/EmptyState.jsx` and `src/components/ui/button.jsx` are used across the app.
- Bad example:
  - A feature copies a button or card implementation into its own folder instead of reusing the shared primitive.
- Exceptions:
  - A feature may wrap a shared primitive for product semantics, but it must not reimplement the base behavior.

### Rule 7: Keep infrastructure in `src/lib/` and `src/services/`

- Why: Data access, auth, query config, and cross-cutting helpers must not be mixed with UI code.
- Good example:
  - Auth helpers live in `src/lib/AuthContext.jsx` or `src/features/auth/` while request logic is centralized in service modules.
- Bad example:
  - API calls are embedded directly inside a page component.
- Exceptions:
  - A very local helper that is only used by one component may live near the component, but it should be moved if reused.

---

## 3. Feature-first organisation

### Rule 8: Every meaningful product domain gets a feature boundary

- Why: The app has clear domains: auth, clusters, mock tests, questions, jobs, templates, analytics, billing, team, integrations, settings, and practice sessions. These should be treated as modules.
- Good example:
  - `src/features/mockTests/` owns overview, review, processing, export, and editor flows.
- Bad example:
  - A new “review card” is placed in a generic component folder with no feature context.
- Exceptions:
  - Truly generic UI primitives remain in shared component folders.

### Rule 9: Route files must not own domain logic

- Why: The current app already shows that route pages become difficult to maintain when they contain both orchestration and implementation details.
- Good example:
  - The route page just mounts `MockTestWorkspaceFeature` and passes route params.
- Bad example:
  - The route page contains query invalidation, mutation handlers, inline derived state, and the full page JSX.
- Exceptions:
  - A route can own minimal local UI state if it does not cross feature boundaries.

### Rule 10: Feature folders must contain only the files that belong to that domain

- Why: This avoids cross-domain coupling and makes refactors safer.
- Good example:
  - `src/features/questions/` contains question editor UI, question form logic, and question mutation hooks.
- Bad example:
  - The questions feature imports cluster-specific utilities and also owns billing UI.
- Exceptions:
  - Cross-feature shared items should be promoted to `src/features/shared/` or `src/components/`.

---

## 4. Component design

### Rule 11: Components must be small, focused, and composable

- Why: Large JSX trees are hard to read and test. The current pages already show this problem.
- Good example:
  - A `QuestionEditorPanel` receives only the question data and callbacks it needs.
- Bad example:
  - A component handles questions, options, validation, persistence, and layout in one block.
- Exceptions:
  - A page-level container may still be larger if it is a route composition boundary.

### Rule 12: Presentational components must not fetch data

- Why: Data fetching belongs in hooks or services. Presentational components should be reusable and easy to test.
- Good example:
  - `ClusterCard` receives props and renders them; data is supplied from a hook.
- Bad example:
  - `ClusterCard` calls `api.listClusters()` directly.
- Exceptions:
  - A small route-specific container may own a single data fetch if it is not reused elsewhere.

### Rule 13: Components must accept explicit props and avoid hidden context dependencies when possible

- Why: Hidden context usage makes components harder to test and reuse.
- Good example:
  - `ReviewTab` receives `questions`, `onStatusChange`, and `onDelete` as props.
- Bad example:
  - `ReviewTab` reaches into global context for everything it needs.
- Exceptions:
  - Auth and theme context are acceptable where they are truly cross-cutting.

### Rule 14: Avoid inline render helpers for anything reusable

- Why: Inline helper functions inside JSX make the component harder to scan and harder to extract later.
- Good example:
  - `QuestionStatusBadge` is extracted as a component.
- Bad example:
  - The component contains a block of `if/else` to render status pills inline.
- Exceptions:
  - Tiny, local formatting helpers are acceptable if they are not reused.

---

## 5. Hooks

### Rule 15: Put data-fetching and feature orchestration into hooks

- Why: The current codebase repeatedly performs query setup, invalidation, and mutation logic inside route pages. Hooks make this reusable and easier to test.
- Good example:
  - `useClusterDetails(clusterId)` returns `cluster`, `mockTests`, `isLoading`, `updateCluster`, and `deleteCluster`.
- Bad example:
  - The page component contains both the query and the mutation handlers.
- Exceptions:
  - A small local stateful interaction may remain inside a component if it is not shared.

### Rule 16: Hooks must have a single responsibility

- Why: Multi-purpose hooks become hard to understand and hard to test.
- Good example:
  - `useQuestionEditor` owns editor state; `useQuestionPersistence` owns save mutations.
- Bad example:
  - A hook handles editing state, API persistence, and analytics tracking at once.
- Exceptions:
  - A hook may compose other hooks if the responsibility is clearly layered.

### Rule 17: Hooks must be named consistently

- Why: Consistent hook naming makes code easier to scan and avoids confusion.
- Good example:
  - `useDashboardSummary`, `useClusterMutations`, `useMockTestWorkspace`.
- Bad example:
  - `useDashboardData`, `useClusterOps`, and `useWorkspaceStuff` all describe similar work differently.
- Exceptions:
  - Legacy names may remain only in pre-existing files until refactored.

---

## 6. State management

### Rule 18: Use local state for local UI concerns only

- Why: The app should not rely on a large amount of component-level state for core business flows.
- Good example:
  - A modal open/closed state and a form field state remain local to a component.
- Bad example:
  - The dashboard stores cluster list, selected cluster, and view mode in scattered local state across unrelated components.
- Exceptions:
  - Temporary UI-only state is still fine locally.

### Rule 19: Do not introduce a new global state library unless the feature truly requires it

- Why: The repository already uses React context for auth and theme, and TanStack Query for server state. Adding another state layer increases complexity.
- Good example:
  - Feature data lives in React Query plus a small feature hook.
- Bad example:
  - A new Zustand or Redux slice is introduced for a simple modal or filter state.
- Exceptions:
  - A future product requirement may justify a dedicated state library, but that must be approved in design review.

### Rule 20: Keep server state in React Query and keep UI state local

- Why: This is already the project’s intended architecture and prevents duplicated state logic.
- Good example:
  - `useQuery` fetches cluster data; local `useState` controls whether the edit form is open.
- Bad example:
  - A page stores the list of mock tests in local state and also uses React Query for the same data.
- Exceptions:
  - A short-lived optimistic UI state may be local even when it is tied to a mutation.

---

## 7. React Query conventions

### Rule 21: Query keys must be consistent and feature-based

- Why: Query keys are the contract for caching and invalidation. Inconsistent keys cause stale UI and repeated refetches.
- Good example:
  - `['clusters']`, `['cluster', clusterId]`, `['mock-test', mockTestId]`, `['questions', mockTestId]`.
- Bad example:
  - Mixed keys like `['clusterData']`, `['cluster-info']`, and `['mocktest']` for the same resource.
- Exceptions:
  - Legacy keys may remain until the surrounding feature is refactored.

### Rule 22: Query invalidation must be centralized in hooks or service helpers

- Why: The current project repeats invalidation logic in several pages. Centralizing it reduces drift and missed cache updates.
- Good example:
  - A `useClusterMutations` hook invalidates `['clusters']`, `['cluster', id]`, and `['dashboard-summary']` from one place.
- Bad example:
  - Each page manually invalidates its own queries in different ways.
- Exceptions:
  - Small one-off mutations may keep local invalidation if the scope is tiny and not reused.

### Rule 23: Polling is allowed only for live-status flows

- Why: Polling is appropriate for jobs and processing progress, but it should not be used for generic data refresh.
- Good example:
  - A processing-jobs query refetches while the job status is `queued` or `running`.
- Bad example:
  - Every page polls every 5 seconds for unrelated data.
- Exceptions:
  - A feature may use long polling if the backend contract requires it.

---

## 8. API layer

### Rule 24: All network requests must pass through a single API layer

- Why: This project already centralizes backend calls in `src/lib/api.js`; all new work must preserve that boundary.
- Good example:
  - A new request is added as `api.createQuestion(payload)` or a dedicated feature service that wraps the API layer.
- Bad example:
  - A component calls `fetch()` directly.
- Exceptions:
  - Very small local prototypes may use a temporary helper, but they must be moved before merge.

### Rule 25: The API layer must own request formatting and auth headers

- Why: Auth and workspace headers are cross-cutting concerns and should not be reimplemented in components.
- Good example:
  - The API client adds the auth token and workspace header automatically.
- Bad example:
  - A component manually appends `Authorization` and `x-workspace-id` headers.
- Exceptions:
  - A test harness may bypass this rule only in isolated test setup.

### Rule 26: Normalize backend responses at the edge

- Why: Backend payloads use inconsistent naming patterns. The frontend should normalize them once and keep the rest of the app consistent.
- Good example:
  - A service maps snake_case API fields to camelCase frontend models.
- Bad example:
  - Each page manually reads `mock_test_count`, `question_text`, and `correct_option_indexes` directly.
- Exceptions:
  - A temporary feature may consume the raw response until a service is introduced, but it must not remain long-term.

---

## 9. Services

### Rule 27: Services must own domain operations and orchestration

- Why: Feature logic should not live in route components. Services provide the stable boundary between UI and backend behavior.
- Good example:
  - `clusterService.createCluster(payload)` and `mockTestService.reprocessMockTest(id)` encapsulate the backend contract.
- Bad example:
  - The page component directly calls the API client and then manually handles cache invalidation and UI transitions.
- Exceptions:
  - A local helper that is only used once may remain in the feature hook if it is still small.

### Rule 28: Services must not import UI components

- Why: Services should stay framework-agnostic and reusable.
- Good example:
  - A service returns plain data objects and errors.
- Bad example:
  - A service imports a React component to render an error toast.
- Exceptions:
  - A feature service may return metadata that a UI layer uses to render an error state.

---

## 10. Utilities

### Rule 29: Utilities must be pure and domain-agnostic

- Why: Utility modules are reused across features and should not depend on React or route state.
- Good example:
  - `formatTimeAgo`, `normalizeQuestionStatus`, and `toPercent` are pure functions.
- Bad example:
  - A utility reads from `window.localStorage` and also imports a component.
- Exceptions:
  - Browser-specific helpers may access `window` when necessary, but they must be isolated.

### Rule 30: Shared utilities must be placed in `src/lib/` or feature-local `utils/` folders

- Why: The app already uses `src/lib/` for cross-cutting helpers. Keep utility ownership clear.
- Good example:
  - `src/features/mockTests/utils/buildProcessingPhases.js` for mock-test-specific logic.
- Bad example:
  - A helper is duplicated across multiple pages with slight variations.
- Exceptions:
  - A one-off helper may remain near the component until duplication is observed.

---

## 11. Design system usage

### Rule 31: Use existing design-system primitives before creating a new one

- Why: The repository already includes a growing set of shared components. Reuse them to avoid visual and semantic drift.
- Good example:
  - Use `EmptyState`, `StatusBadge`, `StatTile`, `ConfirmDialog`, and `ProgressStepper`.
- Bad example:
  - A new page creates its own status badge, empty state, or confirm dialog.
- Exceptions:
  - New product-specific primitives may be added if the existing set is missing a required pattern.

### Rule 32: New feature UI must follow the established PaperFlow semantic vocabulary

- Why: The app’s design system is tied to product semantics such as review status, confidence, processing stage, and workspace state.
- Good example:
  - A review screen uses status badges for `approved`, `review`, and `rejected`.
- Bad example:
  - A new feature uses generic `blue/green/red` badges without semantic meaning.
- Exceptions:
  - Short-lived prototypes may use temporary labels if explicitly marked as temporary.

---

## 12. Styling conventions

### Rule 33: Use Tailwind utility classes and design tokens; do not introduce ad hoc color values

- Why: The app already centralizes tokens in `src/index.css`. Hard-coded hex values cause visual inconsistencies and make theme migration harder.
- Good example:
  - `className="surface-card rounded-2xl border border-border p-4"`.
- Bad example:
  - `className="bg-[#ea580c] text-[#f59e0b] border-[#e2e8f0]"` repeated across multiple files.
- Exceptions:
  - Temporary placeholders may use local colors, but they must be migrated before merge.

### Rule 34: Prefer semantic utility classes over one-off class strings

- Why: The current codebase has many repeated structural class patterns that should become reusable primitives.
- Good example:
  - A page uses a shared `PageHeader` or `SectionCard` instead of re-declaring the same header/body spacing layout.
- Bad example:
  - Every page repeats the same `space-y-6 max-w-7xl mx-auto` layout manually.
- Exceptions:
  - A route can use a one-off layout if it is truly unique.

### Rule 35: Keep styling local to the component unless it is a shared theme concern

- Why: Global CSS should stay limited to tokens, utilities, and system-level layout helpers.
- Good example:
  - A component uses Tailwind utilities only.
- Bad example:
  - A component adds a bespoke CSS class in `App.css` or `index.css` for a one-off feature.
- Exceptions:
  - A shared utility class can be promoted to `index.css` only if it is truly reusable.

---

## 13. Accessibility

### Rule 36: Every interactive element must be keyboard accessible and semantically appropriate

- Why: The app is product-focused and should be usable by all users, not just mouse-driven interaction.
- Good example:
  - Buttons use native `<button>` elements; menus and dialogs use appropriate ARIA semantics.
- Bad example:
  - A clickable `<div>` handles actions but is not keyboard accessible.
- Exceptions:
  - A purely visual decorative element may be non-interactive and not focusable.

### Rule 37: Form controls must have labels and visible validation feedback

- Why: The current app has several form-heavy routes such as auth, settings, cluster creation, and question editing.
- Good example:
  - Inputs have labels and error messages tied to the field.
- Bad example:
  - A text input is rendered with a placeholder and no label.
- Exceptions:
  - Icon-only controls may use `aria-label` if the visible UI is not descriptive.

### Rule 38: Dialogs, modals, and overlays must support focus management and dismissal patterns

- Why: The app uses several overlay-based interactions such as create-cluster and template preview.
- Good example:
  - A modal traps focus while open and closes on Escape.
- Bad example:
  - A modal opens but cannot be closed by keyboard.
- Exceptions:
  - Temporary prototypes may skip these details only if explicitly marked non-production.

---

## 14. Performance

### Rule 39: Keep route-level imports light and use lazy loading for heavy screens

- Why: The product has several rich screens that should not load all at once.
- Good example:
  - Heavy analytics or editor screens are lazy-loaded with `React.lazy()` or a route-level dynamic import.
- Bad example:
  - A large analytics page is bundled into the initial route payload unnecessarily.
- Exceptions:
  - Very small pages may remain eager-loaded if the impact is negligible.

### Rule 40: Avoid unnecessary re-renders

- Why: Large page trees become sluggish when props and state are passed through too much.
- Good example:
  - Derived data is memoized and only the affected section rerenders.
- Bad example:
  - A filter state causes the full page tree to rerender for every keystroke.
- Exceptions:
  - Simple local UI state may accept minor rerender cost if the component is small.

### Rule 41: Use React Query for server state and avoid duplicated fetches

- Why: The app already uses React Query, and unnecessary duplicate requests create poor UX and extra load.
- Good example:
  - A page shares one query result with all child components through the same hook.
- Bad example:
  - Each component independently requests the same data from the backend.
- Exceptions:
  - One-off local data may be fetched once in a small feature component if it is not shared.

---

## 15. Naming conventions

### Rule 42: Use PascalCase for components, camelCase for functions and variables, and kebab-case for file names

- Why: The repository already uses a common React convention and this should remain consistent.
- Good example:
  - `QuestionEditorPanel.jsx`, `useClusterDetails()`, `const activeTab = ...`.
- Bad example:
  - `questioneditorpanel.jsx`, `use_cluster_details()`, `const ActiveTab = ...`.
- Exceptions:
  - Route files may use the existing route naming pattern as long as it is consistent.

### Rule 43: Use domain-specific names, not vague ones

- Why: Generic names such as `Data`, `Item`, or `Panel` create ambiguity and make refactoring harder.
- Good example:
  - `ClusterSummaryCard`, `MockTestReviewList`, `QuestionOptionEditor`.
- Bad example:
  - `Box`, `Thing`, `Widget`, `MainPanel`.
- Exceptions:
  - Shared primitives may still use generic names if the semantics are intentionally universal.

### Rule 44: Frontend field names must be camelCase; preserve snake_case only at the API boundary

- Why: The app already mixes snake_case and camelCase and this should be normalized at the service boundary.
- Good example:
  - The UI uses `mockTestName` and `questionNo`; the service maps `mock_test_name` and `question_no` from the API.
- Bad example:
  - The UI passes raw snake_case fields throughout the component tree.
- Exceptions:
  - Legacy code may retain old field names until it is refactored.

---

## 16. File size limits

### Rule 45: Keep React files within reasonable size limits

- Why: The current repo already contains large route files that should be split.
- Good example:
  - A page file stays under 250 lines; a component under 120 lines; a hook under 200 lines.
- Bad example:
  - A page file grows past 400 lines while still mixing layout, state, API, and helpers.
- Exceptions:
  - A file may temporarily exceed the limit if it is a migration bridge, but it must be planned for extraction in the same PR.

### Rule 46: Extract when a file has more than one concern

- Why: File size is a symptom of mixed responsibilities.
- Good example:
  - A page file delegates data logic to a hook and UI sections to subcomponents.
- Bad example:
  - A single file handles route state, API calls, form logic, rendering, and utility transformations.
- Exceptions:
  - A small route adapter is allowed to own composition and routing params only.

---

## 17. Component extraction rules

### Rule 47: Extract a component when it becomes visually or logically reusable

- Why: Reuse reduces duplication and makes future changes safer.
- Good example:
  - A repeated “processing status panel” is extracted into a shared `ProcessingStatusCard` used by jobs and mock-test workspace.
- Bad example:
  - A new duplicate panel is created in two pages because the existing implementation is “close enough.”
- Exceptions:
  - A temporary one-off screen may postpone extraction if it is clearly isolated and small.

### Rule 48: Extract a hook when a component owns more than one behavior boundary

- Why: Data fetching, mutation orchestration, and UI state should not all live in the same component.
- Good example:
  - A form component delegates save and validation to `useQuestionEditor()`.
- Bad example:
  - The form component also calls the API and handles query invalidation inline.
- Exceptions:
  - Simple local toggles may remain local.

---

## 18. Error handling

### Rule 49: Every async flow must have a user-visible failure path

- Why: The app interacts with APIs, uploads, and processing jobs. Silent failures are unacceptable.
- Good example:
  - A failed mutation shows an inline error banner and keeps the UI in a safe state.
- Bad example:
  - The user clicks save and nothing happens because the error is swallowed.
- Exceptions:
  - Non-critical UI toggles may fail silently in a local-only draft state if they are clearly temporary.

### Rule 50: Do not swallow errors; transform them into actionable messages

- Why: The current codebase needs clearer error recovery and easier debugging.
- Good example:
  - A service maps a backend error to `Could not update cluster` and passes it to the UI.
- Bad example:
  - `catch {}` hides the error and leaves the user with no feedback.
- Exceptions:
  - Logging may be added in development while preserving a user-safe fallback.

---

## 19. Logging

### Rule 51: Use logs sparingly and only for meaningful failures

- Why: Logging should help debugging without cluttering the product experience.
- Good example:
  - `console.error` is used only for unexpected failures during development or instrumentation.
- Bad example:
  - Every state change logs to the console.
- Exceptions:
  - Temporary debugging logs may be used during development if they are removed before merge.

### Rule 52: Prefer user-visible feedback over console-only reporting

- Why: The app already relies on inline banners and error states for observability.
- Good example:
  - Failed cluster creation shows an inline error and keeps the form interactive.
- Bad example:
  - The failure is only logged to the console and the user sees nothing.
- Exceptions:
  - Backend and infrastructure issues may require server-side logging plus a user-safe fallback.

---

## 20. Routing

### Rule 53: Route definitions must stay centralized

- Why: Routing is already centralized in `src/App.jsx`, and route changes should not be scattered across the app.
- Good example:
  - New route definitions are added to the central router configuration and route constants.
- Bad example:
  - A new screen imports a router directly and defines a route inside a component.
- Exceptions:
  - Temporary demo routes may be added locally while a feature is under development, but they must be promoted before merge.

### Rule 54: Route params must be passed into feature modules, not read repeatedly in the UI tree

- Why: Route params are part of the feature boundary and should be consumed once at the outer shell.
- Good example:
  - The route page passes `clusterId` and `mockTestId` into a feature module.
- Bad example:
  - Each nested component reads route params independently.
- Exceptions:
  - Tiny leaf components may read route params if it is truly local and the code remains simple.

---

## 21. Testing expectations

### Rule 55: Every non-trivial feature change must have tests or a documented manual verification path

- Why: The repo needs stronger confidence as it grows. New features should not rely only on visual inspection.
- Good example:
  - A new hook is covered by a unit test and a new feature screen has a component test.
- Bad example:
  - A new mutation flow is added with no test and no verification notes.
- Exceptions:
  - A temporary visual prototype can ship without tests only if it is explicitly marked as temporary and not intended for production use.

### Rule 56: Test the behavior, not implementation details

- Why: Tests should protect user-visible behavior and domain logic, not internal state names.
- Good example:
  - A test verifies that the review tab shows the correct count and status badges after a question is approved.
- Bad example:
  - A test asserts on internal hook state or component-private helper names.
- Exceptions:
  - Utility functions may be tested directly if they are pure.

---

## 22. Refactoring policy

### Rule 57: Refactor existing pages when they exceed the size or complexity threshold

- Why: The current app contains several pages that should be split to remain maintainable.
- Good example:
  - A page that exceeds 250 lines is refactored into a route page plus feature modules and hooks in the same change.
- Bad example:
  - New logic is added to a 400-line page without refactoring the structure.
- Exceptions:
  - A small bug fix may remain localized if the change is narrow and clearly scoped.

### Rule 58: Preserve behavior while improving structure

- Why: Refactoring must be safe and predictable.
- Good example:
  - A component is extracted without changing the visible behavior of the screen.
- Bad example:
  - The refactor also changes the UI flow and the product semantics in the same PR.
- Exceptions:
  - A deliberate redesign may legitimately change behavior if the PR clearly documents it.

---

## 23. Pull Request checklist

Every PR must confirm the following:

- The change is aligned to the feature-first architecture and does not introduce a new monolithic page.
- Reusable UI was placed in the design system or a shared component rather than duplicated.
- New data access is routed through hooks/services instead of being embedded directly in the page.
- The change uses existing design-system primitives and tokens instead of ad hoc styling.
- The change follows the repository file-size and extraction rules.
- The change includes testing or a documented manual verification path.
- The change does not introduce new global state without justification.
- The change preserves accessibility and does not break keyboard navigation or forms.

---

## 24. AI Coding Guidelines

### Rule 59: AI agents must prefer existing patterns over inventing new ones

- Why: The repository’s main risk is inconsistency and architectural drift.
- Good example:
  - An agent checks the existing cluster feature modules, hooks, and design-system components before creating a new cluster UI.
- Bad example:
  - An agent creates a new state layer, a new button component, and a new route style because it does not inspect the existing architecture.
- Exceptions:
  - If a required pattern is absent, the agent should propose a minimal shared solution rather than a local hack.

### Rule 60: AI agents must not add a new abstraction unless it improves the current architecture

- Why: The project already has technical debt; unnecessary abstractions create friction.
- Good example:
  - An agent extracts a small hook or shared component only when the code clearly benefits from it.
- Bad example:
  - An agent creates a large wrapper abstraction for a tiny change.
- Exceptions:
  - A foundational refactor may introduce abstraction if it directly supports the architecture plan.

### Rule 61: AI agents must preserve the repository’s product language and visual system

- Why: The app’s design system and domain semantics are a product asset, not a stylistic afterthought.
- Good example:
  - An agent uses the existing PaperFlow status vocabulary and shared design-system components.
- Bad example:
  - An agent introduces a new color system or generic UI wording that clashes with the product’s established semantics.
- Exceptions:
  - A redesign PR may intentionally evolve the design vocabulary, but it must be explicit and reviewed.

---

## Implementation policy for new files

Every new React file in this repository must follow this order:

1. Check whether a shared component, hook, service, or utility already exists.
2. Place the file in the correct feature or shared location.
3. Keep the file focused and small.
4. Use the design system and repository tokens.
5. Keep business logic in hooks/services, not in the UI file.
6. Add an error path and do not swallow failures.
7. Ensure accessibility and responsive behavior.
8. Verify the change with tests or a documented manual check.

If a file does not follow these rules, it is not production-ready.
