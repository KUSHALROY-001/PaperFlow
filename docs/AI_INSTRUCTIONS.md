# AI INSTRUCTIONS

**Version:** 1.0
**Purpose:** Multi-AI Codebase Coordination & Engineering Memory

---

## 1. Purpose

This project is developed with multiple AI coding agents.

The Engineering Memory System exists to prevent AI agents from:

- repeating previous mistakes
- undoing another AI's work
- conflicting with existing implementations
- repeating failed debugging approaches
- forgetting why a technical decision was made
- assuming a production issue is new when it happened before

The logs are **shared engineering memory**.

They are not a replacement for inspecting the current code.

---

# 2. Engineering Memory Structure

The engineering logs are located in:

```text
engineering-log/
├── CURRENT_STATE.md
├── IMPLEMENTATION_LOG.md
├── DEBUG_LOG.md
├── DECISION_LOG.md
├── KNOWN_ISSUES.md
└── CHANGE_INDEX.md
```

Each file contains a **mini-manual at the top**.

The mini-manual explains:

- what the file contains
- when to read it
- how to search it
- how to add entries
- the required format
- rules specific to that file

**Read the relevant file's mini-manual before using or modifying that file.**

---

# 3. What Each File Means

| File                    | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `CURRENT_STATE.md`      | What is true about the project **right now**                |
| `IMPLEMENTATION_LOG.md` | What has been implemented and why                           |
| `DEBUG_LOG.md`          | What has gone wrong, what was tried, and what worked/failed |
| `DECISION_LOG.md`       | Important architectural and technical decisions             |
| `KNOWN_ISSUES.md`       | Current, recurring, or important unresolved issues          |
| `CHANGE_INDEX.md`       | Quick index for finding relevant history                    |

### Important distinction

`CURRENT_STATE.md` describes the **present**.

The other logs primarily preserve **history**.

Do not turn `CURRENT_STATE.md` into a complete historical record.

---

# 4. Before Changing Code

Follow this process:

```text
1. Read CURRENT_STATE.md
          ↓
2. Identify the affected subsystem
          ↓
3. Search relevant implementation history
          ↓
4. Search relevant debugging history
          ↓
5. Check previous failed approaches
          ↓
6. Check relevant architectural decisions
          ↓
7. Check known issues
          ↓
8. Inspect the current code
          ↓
9. Identify possible conflicts
          ↓
10. Implement / debug
```

**Do not read entire historical logs by default.**

Search them first using relevant:

- feature names
- component names
- file paths
- API endpoints
- error messages
- database tables
- service names
- BUG IDs
- IMP IDs
- DEC IDs

Read only the entries relevant to the current task unless broader history is necessary.

---

# 5. Current Code Is the Source of Truth

Historical logs describe what happened previously.

They may become outdated.

Therefore:

> Never assume that something documented in a historical log is still true.

Always compare historical information with:

1. Current source code
2. Current configuration
3. Current database structure
4. Current runtime behavior
5. Current deployment behavior

If documentation conflicts with the current code, investigate the difference.

Do not silently rewrite the historical record.

---

# 6. Working With Previous AI Implementations

Before modifying an area that another AI may have worked on:

1. Find the previous implementation in `IMPLEMENTATION_LOG.md`.
2. Understand what was changed.
3. Understand why it was changed.
4. Inspect the current code.
5. Check related bugs and decisions.
6. Check whether your change could affect dependent components.

Do not assume:

```text
Previous AI implementation = correct
```

and do not assume:

```text
Previous AI implementation = wrong
```

Verify it.

If replacing a previous implementation, preserve the old history and document the new implementation separately.

---

# 7. Debugging Rules

When debugging, always check whether the problem has happened before.

Search `DEBUG_LOG.md` for:

- the exact error
- similar errors
- affected service
- affected file
- affected API
- affected subsystem
- related BUG IDs

Pay particular attention to **failed approaches**.

If a previous approach failed, do not blindly repeat it.

If you decide to try it again, there must be a new reason, and that reason should be documented.

### Preserve the debugging chain

A useful debugging record should show:

```text
Problem
  ↓
Hypothesis
  ↓
Attempt
  ↓
Result
  ↓
Evidence
  ↓
Next Attempt
  ↓
Final Fix
  ↓
Verification
```

Do not document only the successful fix.

Failed attempts are valuable knowledge for future AI agents.

---

# 8. Local vs Production

Always distinguish between environments.

A fix working on localhost does **not** automatically mean the production issue is fixed.

When relevant, record verification separately:

```text
Local: VERIFIED
Production: VERIFIED
Worker: VERIFIED
Database: VERIFIED
```

For example:

```text
Local: VERIFIED
Production: FAILED
Overall: PARTIALLY RESOLVED
```

Never mark a production issue as resolved based only on local testing.

---

# 9. Architectural Decisions

Before making changes involving shared architecture, inspect `DECISION_LOG.md`.

This is particularly important for:

- Database schema
- API contracts
- Authentication
- OAuth
- CORS
- Storage
- Workers
- Background jobs
- Deployment
- Environment configuration
- Shared services
- Major dependencies

If your proposed change conflicts with an existing decision:

1. Understand the original reason.
2. Determine whether the decision is still valid.
3. Consider the affected components.
4. Make the change only after understanding the consequences.
5. Record the new decision or correction when appropriate.

---

# 10. After Making Changes

For every meaningful implementation or debugging task:

### Implementation

Update `IMPLEMENTATION_LOG.md` with:

- What changed
- Why it changed
- Approach used
- Files affected
- Dependencies/assumptions
- Testing
- Verification
- Result
- Regression risks
- Related BUG/DEC/IMP entries

### Debugging

Update `DEBUG_LOG.md` with:

- Problem
- Symptoms/error
- Initial hypothesis
- Investigation
- Attempts
- Failed approaches
- Successful fix
- Root cause, if confirmed
- Verification
- Regression risks
- Future AI warnings

### Architecture

Update `DECISION_LOG.md` when a meaningful technical or architectural decision is made.

### Current State

Update `CURRENT_STATE.md` whenever the current architecture, behavior, configuration, deployment state, or important risks change.

### Issues

Update `KNOWN_ISSUES.md` when an issue becomes:

- active
- resolved
- recurring
- materially changed

### Index

Update `CHANGE_INDEX.md` for significant new `IMP`, `BUG`, or `DEC` entries.

---

# 11. Historical Records Are Append-Only

Never rewrite an old implementation or debugging entry simply because a later AI discovered a better solution.

Example:

```text
IMP-014
Original implementation
       ↓
BUG-021
Problem discovered
       ↓
IMP-019
Corrected implementation
```

Keep all three.

This allows future AI agents to understand how the system evolved.

---

# 12. Timestamps and Traceability

Every new log entry should contain a timestamp.

Preferred format:

```text
YYYY-MM-DD HH:MM:SS ±TZ
```

Example:

```text
2026-08-31 14:32:17 +05:30
```

Never invent timestamps.

When available, also record:

- AI/agent
- Branch
- Commit
- Files changed
- Environment
- Related entries

If information is unavailable, use:

```text
Unknown
```

Never fabricate historical information.

---

# 13. Security

Never store secrets in the engineering logs.

Do not record:

- API keys
- Passwords
- Access tokens
- OAuth secrets
- Private keys
- Database credentials
- JWT secrets
- Cloud credentials

Use:

```text
[REDACTED]
```

when necessary.

---

# 14. Conflict Detection

Before modifying shared or sensitive areas, consider whether another AI's work could depend on the existing behavior.

Common conflict zones include:

- Frontend ↔ Backend contracts
- Database ↔ Backend
- Authentication ↔ Frontend
- OAuth ↔ Backend
- Storage ↔ Upload system
- Worker ↔ Backend
- Environment variables ↔ Deployment
- Local configuration ↔ Production configuration
- Shared utilities
- Naming conventions
- API response formats

If you identify a meaningful conflict, document it and cross-reference the relevant entries.

---

# 15. Logging IDs

Use unique IDs:

```text
IMP-001    Implementation
BUG-001    Bug / debugging issue
DEC-001    Technical decision
```

Related records should reference each other.

Example:

```text
IMP-014
   ↓
BUG-021
   ↓
IMP-019
   ↓
DEC-008
```

This creates a traceable engineering history.

---

# 16. Recurring Problems

If substantially the same problem appears again, identify it as a recurrence rather than treating it as completely unrelated.

Example:

```text
BUG-010 — Worker connection failure
BUG-018 — Worker connection failure recurrence
BUG-025 — Worker connection failure recurrence
```

Connect recurring issues through `KNOWN_ISSUES.md`, `CURRENT_STATE.md`, and the relevant historical entries.

---

# 17. What Not to Do

Do not:

- Read every historical log for every task.
- Modify code without inspecting the current implementation.
- Assume an old solution is still valid.
- Repeat failed approaches without a new reason.
- Delete failed debugging attempts.
- Rewrite historical records.
- Mark local testing as production verification.
- Undo another AI's changes without understanding them.
- Invent missing history.
- Put secrets into logs.
- Create unnecessary log entries for trivial changes.

---

# 18. Definition of Done

For a meaningful task, completion means:

```text
Understand
   ↓
Check relevant history
   ↓
Inspect current code
   ↓
Implement / Debug
   ↓
Test
   ↓
Verify
   ↓
Update relevant logs
   ↓
Update CURRENT_STATE if needed
   ↓
Update CHANGE_INDEX if needed
```

Documentation is part of the task, not an optional final step.

---

# 19. Core Rule

The Engineering Memory System exists to make each future AI more informed than the previous one.

Before changing code, the AI should be able to answer:

> Has this happened before?

> What did previous AIs try?

> What failed?

> What worked?

> Why is the current implementation designed this way?

> What could my change affect?

> What should I be careful about?

If the answer can be found in the engineering memory, use it.

If it cannot, investigate the current code and add useful knowledge to the system afterward.

**Use the logs as memory. Use the current code as truth. Use verification as evidence.**
