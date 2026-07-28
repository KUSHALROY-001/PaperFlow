# PaperFlow Backend — Architecture Guide for AI Coding Tools

You are writing code for an existing Node.js (ESM) + Express 5 + PostgreSQL backend.
This document is the contract for how new features must be built. Read it fully
before writing any file. If a request conflicts with this guide, follow this guide
and note the conflict instead of silently picking one.

**Never put business logic or SQL inside a route file. Never put a whole feature in
one file. Every feature is split across four layers, always in this order of
responsibility: Route → Controller → Service → Repository.**

---

## 1. The four layers

```
src/routes/<domain>.routes.js        Wiring only. path + middleware + controller fn.
src/controllers/<domain>.controller.js  req/res only. No SQL. No business rules.
src/services/<domain>.service.js     Validation, business rules, transactions.
src/repositories/<domain>.repository.js Raw parameterized SQL only. No req/res.
```

`<domain>` = the resource name, kebab-case, plural where the resource is a collection
(e.g. `mock-tests`, `questions`, `clusters`). One set of four files per domain.
Do not create a fifth "helpers" or "utils" file for a domain — shared cross-domain
helpers go in `src/lib/`.

### Data flow for every request

```
HTTP request
  → routes file matches path, runs middleware (requireAuth, requireRole, etc.)
  → controller function: pulls values off req, calls exactly one service function,
    sends the response
  → service function: validates input, enforces business rules, opens transactions
    if needed, calls one or more repository functions
  → repository function: runs one parameterized SQL query (or a small transaction
    step), returns plain rows/objects — nothing else
```

Each layer only talks to the layer directly below it. A controller must never import
`pool` or write SQL. A repository must never import `express`, `req`, or `res`.

---

## 2. Rules per layer

### `routes/<domain>.routes.js`

- Only: `import`s, `Router()`, `.get/.post/.patch/.delete(...)` calls, middleware.
- Every handler wrapped in `asyncHandler(...)` from `src/lib/async-handler.js`.
- Any endpoint that mutates data beyond simple reads must have a `requireRole(...)`
  guard from `src/middleware/require-role.js`. Default policy unless told otherwise:
  - reads (`GET`) → any authenticated workspace member (`viewer`+)
  - create/update (`POST`/`PATCH` that aren't destructive) → `requireRole('editor')`
  - delete or destructive state changes → `requireRole('admin')`
- If the route needs file upload (multer) or any other request-shaping middleware,
  configure it in the routes file (that's routing infrastructure, not logic), but
  the multer `destination`/`filename` callbacks must not contain business rules —
  they only decide where a file goes.
- Target size: under 40 lines. If it's growing past that, logic is leaking in from
  the wrong layer — move it down.

Example shape (do not skip any of these lines):

```js
import { Router } from "express";
import * as tagsController from "../controllers/tags.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const tagsRouter = Router();

tagsRouter.get("/", asyncHandler(tagsController.list));
tagsRouter.post(
  "/",
  requireRole("editor"),
  asyncHandler(tagsController.create),
);
tagsRouter.get("/:tagId", asyncHandler(tagsController.getOne));
tagsRouter.patch(
  "/:tagId",
  requireRole("editor"),
  asyncHandler(tagsController.update),
);
tagsRouter.delete(
  "/:tagId",
  requireRole("admin"),
  asyncHandler(tagsController.remove),
);
```

### `controllers/<domain>.controller.js`

- Each exported function takes `(req, res)` and:
  1. reads whatever it needs from `req.params` / `req.body` / `req.query` /
     `req.user` / `req.workspaceId`
  2. calls **one** service function
  3. sends the response (`res.json(...)`, `res.status(201).json(...)`,
     `res.status(204).send()`)
- No `try/catch` here — `asyncHandler` + the global `errorHandler` middleware
  handle errors. Never call `pool.query` from a controller.
- No `if` statements implementing business rules. If you're tempted to branch on
  business meaning ("if status is published, also…"), that branch belongs in the
  service.

### `services/<domain>.service.js`

- This is where the actual thinking happens: validation, cross-record rules,
  multi-step transactions, orchestration across multiple repositories.
- Use the shared validators from `src/lib/validators.js`
  (`requiredString`, `optionalString`, `optionalNumber`, `requiredArray`) — don't
  reinvent validation inline.
- Throw `httpError(statusCode, message)` from `src/lib/http-error.js` for expected
  failure cases (404 not found, 400 bad input, 409 conflict, etc.). Never send a
  response directly from a service — it doesn't have `res`.
- Every multi-statement write (insert + related insert, insert + status update,
  etc.) must be wrapped in a transaction:
  ```js
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // ... repository calls, passing `client` through ...
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  ```
- If two endpoints need the same multi-step transaction (e.g. "create a job and
  flip status" needed by both an upload flow and a retry flow), extract it into
  one private function in the service and call it from both public service
  functions. Never duplicate a transaction block across two files.
- Every query that touches workspace-scoped data must be scoped by
  `workspaceId` — pass it down to the repository call, don't trust an ID alone.
- Side effects that touch the filesystem, external APIs, or spawn processes
  (e.g. writing a file, calling the OCR worker) live in the service, using
  helpers from `src/lib/`, never inline SQL-adjacent logic in a repository.

### `repositories/<domain>.repository.js`

- Each exported function does exactly one thing: run one SQL statement (or a
  couple of related statements when they're inseparable, like list + count) and
  return plain rows. No validation, no throwing `httpError`, no HTTP concepts.
- Always use parameterized queries (`$1, $2, ...`) — never string-concatenate
  values into SQL.
- Functions that need to participate in a caller's transaction accept a `client`
  parameter (defaulting to the shared `pool` when not given):
  ```js
  export async function insertThing(client, { workspaceId, name }) {
    const result = await client.query(
      "INSERT INTO things (workspace_id, name) VALUES ($1, $2) RETURNING *",
      [workspaceId, name],
    );
    return result.rows[0];
  }
  ```
- Return `null` (not throw) when a lookup finds nothing — let the service decide
  whether that's a 404.
- DB columns are snake_case; only alias to camelCase in the SQL (`AS "someName"`)
  when the consumer genuinely needs camelCase (e.g. a public-facing view). Don't
  mix naming conventions inside one query without a reason.

---

## 3. Cross-cutting conventions (already established — reuse, don't reinvent)

| Concern                       | Use this                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapping async route handlers | `asyncHandler` from `src/lib/async-handler.js`                                                                                                                                        |
| Throwing expected HTTP errors | `httpError(status, message, details?)` from `src/lib/http-error.js`                                                                                                                   |
| Input validation              | `requiredString`, `optionalString`, `optionalNumber`, `requiredArray` from `src/lib/validators.js`                                                                                    |
| Auth check                    | `requireAuth` middleware (already applied at the `app.js` mount level per domain — don't re-apply per route)                                                                          |
| Role check                    | `requireRole('editor' \| 'admin' \| 'owner')` from `src/middleware/require-role.js`                                                                                                   |
| DB access                     | `pool` / `pool.connect()` from `src/db/pool.js` — never create a new `Pool`                                                                                                           |
| File storage                  | helpers in `src/lib/file-storage.js` (`ensureUploadDir`, `buildStorageKey`, `deleteFileByPath`, `deleteMockTestUploadDir`) — never call `fs` directly from a route/controller/service |
| Background worker trigger     | `startWorkerOnce()` from `src/lib/worker-runner.js`                                                                                                                                   |

Every workspace-scoped table query filters by `workspace_id`. Every mutation
returns the updated row via `RETURNING *` so the service/controller don't need a
follow-up read.

---

## 4. Full worked example: adding a new `tags` resource

Assume `tags` table: `id, workspace_id, created_by, name, color, created_at`.

**`src/repositories/tags.repository.js`**

```js
import { pool } from "../db/pool.js";

export async function listTags(workspaceId) {
  const result = await pool.query(
    "SELECT * FROM tags WHERE workspace_id = $1 ORDER BY created_at DESC",
    [workspaceId],
  );
  return result.rows;
}

export async function createTag({ workspaceId, createdBy, name, color }) {
  const result = await pool.query(
    `INSERT INTO tags (workspace_id, created_by, name, color)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [workspaceId, createdBy, name, color],
  );
  return result.rows[0];
}

export async function findTagById(tagId, workspaceId) {
  const result = await pool.query(
    "SELECT * FROM tags WHERE id = $1 AND workspace_id = $2",
    [tagId, workspaceId],
  );
  return result.rows[0] || null;
}

export async function deleteTag(tagId, workspaceId) {
  const result = await pool.query(
    "DELETE FROM tags WHERE id = $1 AND workspace_id = $2 RETURNING id",
    [tagId, workspaceId],
  );
  return result.rowCount > 0;
}
```

**`src/services/tags.service.js`**

```js
import { httpError } from "../lib/http-error.js";
import { optionalString, requiredString } from "../lib/validators.js";
import * as tagsRepo from "../repositories/tags.repository.js";

export async function listTags(workspaceId) {
  return tagsRepo.listTags(workspaceId);
}

export async function createTag(workspaceId, userId, body) {
  const name = requiredString(body.name, "name");
  const color = optionalString(body.color) || "#999999";
  return tagsRepo.createTag({ workspaceId, createdBy: userId, name, color });
}

export async function deleteTag(tagId, workspaceId) {
  const deleted = await tagsRepo.deleteTag(tagId, workspaceId);
  if (!deleted) throw httpError(404, "Tag not found");
}
```

**`src/controllers/tags.controller.js`**

```js
import * as tagsService from "../services/tags.service.js";

export async function list(req, res) {
  const tags = await tagsService.listTags(req.workspaceId);
  res.json({ tags });
}

export async function create(req, res) {
  const tag = await tagsService.createTag(
    req.workspaceId,
    req.user.id,
    req.body,
  );
  res.status(201).json({ tag });
}

export async function remove(req, res) {
  await tagsService.deleteTag(req.params.tagId, req.workspaceId);
  res.status(204).send();
}
```

**`src/routes/tags.routes.js`**

```js
import { Router } from "express";
import * as tagsController from "../controllers/tags.controller.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireRole } from "../middleware/require-role.js";

export const tagsRouter = Router();

tagsRouter.get("/", asyncHandler(tagsController.list));
tagsRouter.post(
  "/",
  requireRole("editor"),
  asyncHandler(tagsController.create),
);
tagsRouter.delete(
  "/:tagId",
  requireRole("admin"),
  asyncHandler(tagsController.remove),
);
```

**Mount it in `src/app.js`** (the only place that changes outside the new files):

```js
import { tagsRouter } from "./routes/tags.routes.js";
// ...
app.use("/api/tags", requireAuth, tagsRouter);
```

That's the entire pattern. Every new resource follows this exact shape.

---

## 5. Explicit anti-patterns — do not do these

- ❌ Writing `pool.query(...)` inside a route or controller file.
- ❌ Putting `if/else` business rules inside a controller.
- ❌ Copy-pasting the same transaction block into two route handlers instead of
  extracting one shared service function.
- ❌ Writing a file to disk (e.g. via multer) before checking the user actually
  has access to the parent resource — check access first, save second.
- ❌ Deleting a DB row that owns files on disk without also deleting those files.
- ❌ Fetching `req.user.role` and never checking it against anything.
- ❌ Hardcoding a fallback secret/key that silently activates when an env var is
  missing, in a code path that can run in production.
- ❌ String-concatenating any value into a SQL query.
- ❌ One file containing routes + controller + SQL together ("fat route"). If you
  find yourself writing more than ~15 lines inside a single `router.get(...)`
  callback, stop and split it into the four layers.
- ❌ Inventing a new validation helper when one already exists in
  `src/lib/validators.js`.
- ❌ Mixing snake_case and camelCase within the same layer without a stated
  reason (DB stays snake_case; only alias to camelCase where an external
  contract requires it).

---

## 6. Self-check before submitting any new feature

- [ ] Four files created (`routes`, `controller`, `service`, `repository`) for
      each new domain, named consistently.
- [ ] No SQL outside the repository file for this domain.
- [ ] No `res.`/`req.` usage outside the controller file for this domain.
- [ ] Every mutation is scoped by `workspaceId`.
- [ ] Every multi-step write uses a transaction with BEGIN/COMMIT/ROLLBACK.
- [ ] Every destructive/write route has an appropriate `requireRole(...)` guard.
- [ ] Route file mounted in `src/app.js` behind `requireAuth`.
- [ ] Ran `node --check` (or equivalent) on every new file.
- [ ] No file in the feature exceeds ~150 lines. If it does, something in that
      layer is doing another layer's job.
