# AI Component Refactoring & Destructuring Guide (`refactor_guide.md`)

This guide defines the standard operating procedure for AI coding assistants when decomposing/refactoring large, monolithic React components into smaller subcomponents **without changing the UI, styling, functionality, or user experience**.

---

## 🎯 Core Directive: The 1-to-1 Refactoring Rule

> **Golden Rule**: **Zero UI & Zero Behavioral Regression.**  
> The refactored component MUST render **pixel-for-pixel, class-for-class, text-for-text, and behavior-for-behavior identically** to the original component.
>
> ❌ **DO NOT** invent new UI elements (e.g., extra stat cards, unrequested tab bars, new badges, or layout changes).  
> ❌ **DO NOT** alter Tailwind/CSS utility classes, padding, colors, fonts, or responsive grid breakpoints.  
> ❌ **DO NOT** delete or rename state variables, form fields, event handlers, or API payload keys.

---

## 🏗️ The 3-Pillar Component Architecture

Every refactored page should adopt a clean 3-pillar modular architecture:

```
src/
├── hooks/
│   └── use<PageName>.js             # Pillar 1: Custom hook for state & logic
├── components/<pagename>/
│   ├── <Section1>.jsx               # Pillar 2: Destructured subcomponent 1
│   ├── <Section2>.jsx               # Pillar 2: Destructured subcomponent 2
│   └── <ModalComponent>.jsx         # Pillar 2: Destructured modal component
└── pages/
    └── <PageName>.jsx               # Pillar 3: Clean container page (~30–60 lines)
```

### Pillar 1: Custom Hook (`hooks/use<PageName>.js`)
- Houses all `useState`, `useQuery`, `useEffect`, `useCallback`, and custom logic.
- Houses all submit handlers (`handleSave`, `handleDelete`, `handleToggle`).
- Returns a clean object containing state variables and functions.
- Keeps raw state management out of the main visual page file.

### Pillar 2: Destructured Subcomponents (`components/<pagename>/`)
- Each component represents **one logical visual block** from the original file (e.g., `Header`, `FormCard`, `Table`, `Modal`).
- Receives state and handlers via explicit, well-named props.
- Contains the exact JSX markup copied directly from the original file.

### Pillar 3: Container Page (`pages/<PageName>.jsx`)
- Lightweight (~30–60 lines of code).
- Retains any page-level static/mock data if requested by the user.
- Calls `use<PageName>()` hook.
- Renders subcomponents in strict visual top-to-bottom order.

---

## 📋 Step-by-Step AI Refactoring Checklist

Follow these 6 steps sequentially whenever decomposing a large component:

### Step 1: Deep Code Inspection
- Read the entire original file line-by-line.
- List all state variables (`useState`), server queries (`useQuery`), side effects (`useEffect`), forms, inline subcomponents, and modal dialogs.
- Identify exact JSX boundaries for each section.

### Step 2: 1-to-1 Component Mapping Plan
- Map every visual section of the monolithic file to a dedicated subcomponent file.
- Verify that **NO new visual features** are added and **NO existing features** are omitted.

### Step 3: Create Custom Hook (`use<PageName>.js`)
- Extract all state initialization, state setters, query hooks, and event handlers into `hooks/use<PageName>.js`.

### Step 4: Extract Subcomponents (`components/<pagename>/`)
- Copy the exact JSX blocks from the original file into standalone functional component files in `components/<pagename>/`.
- Preserve all imports (`lucide-react` icons, sub-helpers, UI components).
- Ensure prop signatures strictly pass required state values and handlers.

### Step 5: Assemble Main Page (`pages/<PageName>.jsx`)
- Replace the monolithic file contents with imports for the custom hook and destructured subcomponents.
- Keep any inline mock data intact if requested by the user for future backend integration.

### Step 6: Automated Build Verification
- Execute `npm run build` or the project build check command.
- Confirm **0 syntax errors, 0 missing prop errors, and 0 broken import paths**.

---

## 🚫 Common AI Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Correct Approach |
| :--- | :--- | :--- |
| **"Feature Hallucination"** | Adding new stat cards, tab filters, or modern gradients not in the original code. | Refactor 1-to-1. Only change code structure, NEVER change the UI unless explicitly requested. |
| **"Class Name Drift"** | Modifying `p-5 sm:p-6` to `p-4`, or changing font sizes / colors. | Copy JSX markup verbatim to guarantee zero CSS regression. |
| **"Over-Abstraction"** | Creating a subcomponent file for a 3-line standard `<h1>` header or a single generic `<button>`. | Group meaningful visual cards, forms, tables, grids, and modals into subcomponents. |
| **"Deleting Mock Data"** | Removing mock JSON arrays from the page file when the user needs them for future API integration. | Retain mock arrays where requested by the user until backend endpoints are ready. |

---

## 🤖 Prompt Template to Paste into AI Instructions

When asking any AI agent to refactor a component, include the following prompt instructions:

```markdown
### Component Refactoring Directive for AI

Please refactor/destructure the requested React component page following these strict rules:

1. **1-to-1 Refactoring Only**:
   - Preserve all existing UI, layout, Tailwind/CSS classes, text strings, icons, and interactive behaviors EXACTLY as they are.
   - Do NOT add any extra unrequested stat cards, navigation tabs, buttons, or design elements.

2. **3-Pillar Architecture**:
   - **Hook**: Extract all `useState`, `useQuery`, `useEffect`, form handlers, and calculations into `hooks/use<PageName>.js`.
   - **Components**: Destructure logical UI sections (Header, Cards, Grids, Modals) into individual `.jsx` files under `components/<pagename>/`.
   - **Main Page**: Keep `pages/<PageName>.jsx` lightweight, invoking the hook and composing the subcomponents.

3. **Data Preservation**:
   - If mock JSON data exists and is marked to remain in the page file for upcoming backend integration, keep it in the page file as requested.

4. **Verification**:
   - Run the frontend build command (`npm run build` or Vite check) to verify zero compilation or import errors before finishing.
```
