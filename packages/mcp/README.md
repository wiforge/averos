# @averos/mcp

> MCP server for Averos. Exposes the full four-layer pipeline as structured tools for Claude Desktop and any MCP-compatible client — enabling conversational Angular application design and generation.

---

## Overview

`@averos/mcp` is the bridge between the Averos pipeline and LLM interfaces. It exposes each pipeline stage as an MCP tool, manages per-conversation session state, and coordinates the design → validation → planning → approval → execution workflow.

```
┌─────────────────────────┐   
│ Claude Desktop /        │
│            MCP Client   │
└────────┬────────────────┘   
         │
         │  MCP tools (stdio)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ @averos/mcp server                                              │   
│        │                                                        │
│        ├── create_session      session management               │   
│        ├── update_ir           manifest mutation (JSON Patch)   │          
│        ├── validate_ir         validation pipeline              │   
│        ├── build_execution_plan orchestration pipeline          │          
│        ├── approve_plan        user approval gate               │       
│        ├── execute_plan        execution engine                 │  
│        ├── get_status          session introspection            │     
│        ├── list_revisions      revision history                 │
│        ├── rollback_revision   manifest undo                    │
│        └── diff_ir             semantic diff                    │ 
│                                                                 │ 
└─────────────────────────────────────────────────────────────────┘
```

The MCP server never calls LLM APIs directly. It is a deterministic orchestration layer — the LLM drives it through tool calls.

---

## Quick Start

### Build

```bash
npm run build -w packages/mcp
```

### Add to Claude Desktop

Edit `~/.config/claude/claude_desktop_config.json` (Linux/Mac) or
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "averos": {
      "command": "node",
      "args": [
        "/absolute/path/to/averos-dag-engine/packages/mcp/dist/index.js"
      ],
      "env": {
        "AVEROS_SESSION_DIR": "/home/user/.averos/sessions"
      }
    }
  }
}
```

Restart Claude Desktop. The Averos tools will appear in the tool picker.

---

## Conversation Workflow

```
User: "Build a task management app with ToDo items and subtasks,
       keycloak authentication, English and French."

Claude calls:
  1. create_session(workspaceDir="/workspace/myapp")
  2. update_ir(patch=[{ op:"add", path:"", value:{...manifest...} }])
  3. validate_ir()         → "✅ valid — 47 nodes"
  4. build_execution_plan() → presents plan to user

Claude: "Here is what will be generated:
  - 3 entities (ToDoArea, ToDoTask, CompositeTestEntity)
  - Keycloak authentication
  - 2 CRUD use cases
  - English and French translations
  Shall I proceed?"

User: "Yes"

Claude calls:
  5. approve_plan(decision="approve")
  6. execute_plan()        → "✅ 47 operations in 84s"
```

### Incremental update

```
User: "Add a priority field to ToDoTask"

Claude calls:
  1. update_ir(patch=[{
       op: "add",
       path: "/entities/1/members/-",
       value: { memberNature:"simple", ename:"ToDoTask",
                mname:"priority", memberType:"number" }
     }])
  2. validate_ir()
  3. build_execution_plan() → "1 operation: add field priority"
  4. approve_plan(decision="approve")
  5. execute_plan()         → "✅ 1 operation in 3s"
```

### Undo

```
User: "Revert that — go back to before the priority field"

Claude calls:
  1. list_revisions()        → shows revision history
  2. rollback_revision(revision=3)
  3. validate_ir()
  4. build_execution_plan()
```

---

## Tools Reference

### `create_session`

Creates a new design session. Must be called first — all other tools require a `sessionId`.

```typescript
create_session({
  workspaceDir: string,   // absolute path to workspace
  config?: {
    mode?:        'strict' | 'resilient',
    timeoutMs?:   number,
    maxAttempts?: number,
    dryRun?:      boolean,
  }
})
// → { sessionId, workspaceDir, config, display }
```

### `get_ir`

Returns the current session manifest.

```typescript
get_ir({ sessionId })
// → { revision, manifest, display }
```

### `update_ir`

Applies JSON Patch operations (RFC 6902) to the manifest. Invalidates validation and plan.

```typescript
update_ir({
  sessionId,
  patch: JsonPatchOperation[],   // RFC 6902
  comment?: string,              // stored in revision history
})
// → { revision, manifest, patchedPaths, message }
```

**JSON Patch examples:**

```json
[{ "op": "add",     "path": "/applicationName",       "value": "MyApp" }]
[{ "op": "replace", "path": "/entities/0/name",        "value": "Task" }]
[{ "op": "remove",  "path": "/entities/0/members/2"                    }]
[{ "op": "add",     "path": "/entities/0/members/-",  "value": {...}   }]
```

### `reset_ir`

Replaces the entire manifest. Use `update_ir` for surgical edits.

```typescript
reset_ir({
  sessionId,
  manifest: Record<string, unknown>,
  comment?: string,
})
```

### `diff_ir`

Shows semantic differences between manifest versions using the DAG engine's authoritative diff.

```typescript
diff_ir({
  sessionId,
  mode: 'current_vs_executed'   // what changed since last run
      | 'revision_vs_revision'  // compare two history entries
      | 'current_vs_revision',  // current vs a historical snapshot
  fromRevision?: number,
  toRevision?:   number,
})
// → { toAdd, toUpdate, unchanged, conflicts, toRemove, isIdentical, display }
```

### `validate_ir`

Validates the manifest against all 27 structural, referential, and constraint rules.

```typescript
validate_ir({ sessionId })
// → { valid, nodeCount, errorCount, warningCount, errors, display }
```

### `build_execution_plan`

Diffs the validated manifest against current build state, constructs the DAG, and produces an ordered execution plan.

```typescript
build_execution_plan({ sessionId })
// → { plan, nodeCount, actionCount, skippedCount, warningCount, display }
```

Plan staleness is deterministic: the plan is invalid if `design.revision !== planning.manifestRevisionAtPlan`. No time-based TTL.

### `approve_plan`

Records user approval or rejection. `execute_plan` requires prior approval.

```typescript
approve_plan({
  sessionId,
  decision: 'approve' | 'reject',
  reason?:  string,
})
```

### `execute_plan`

Executes the approved plan via real Angular schematics. **Has real filesystem side effects.**

```typescript
execute_plan({
  sessionId,
  dryRun?:  boolean,   // override session config
  mode?:    'strict' | 'resilient',
})
// → { executionId, summary, failures, display }
```

Stores are reconstructed from serialized paths at call time — `SessionState` contains no runtime objects and is fully serializable.

### `get_status`

Returns current pipeline phase, validation status, plan freshness, and last execution summary.

```typescript
get_status({ sessionId })
// → { phase, isValidated, hasPlan, isPlanFresh, approval,
//     executionPhase, lastRun, display }
```

### `list_revisions`

Lists manifest revision history for undo/audit.

```typescript
list_revisions({ sessionId })
// → { currentRevision, count, revisions[], display }
```

### `rollback_revision`

Restores the manifest to a previous revision. Invalidates validation and plan.

```typescript
rollback_revision({
  sessionId,
  revision: number,   // from list_revisions
})
// → { restoredRevision, newRevision, display }
```

---

## Session State Architecture

Session state is split into four independent domains:

```typescript
SessionState = {
  metadata:  SessionMetadata    // id, timestamps, workspaceDir, config
  design:    DesignState        // manifest, validationResult, revision, history
  planning:  PlanningState      // plan, planCreatedAt, approval, manifestRevisionAtPlan
  execution: ExecutionState     // phase, lastSummary, checkpointPath, statePath, history
}
```

**Key design decisions:**

- `CheckpointStore` and `StateStore` are **not** stored in session state — they are non-serializable runtime objects. Instead, `execution.checkpointPath` and `execution.statePath` are stored as strings and stores are constructed at execution time.
- `validatedManifest` and `normalizedManifest` are **not** cached — they are re-derived on demand to prevent staleness. Only `manifest` (source of truth) and `validationResult` are stored.
- Plan staleness uses `manifestRevisionAtPlan !== design.revision` — deterministic, not time-based.
- `ApprovalState` is a first-class enum: `'not_required' | 'pending' | 'approved' | 'rejected'`.
- Execution history is capped at `MAX_EXECUTION_HISTORY = 50` entries.
- Manifest revision history is capped at `MAX_HISTORY_SIZE = 50` entries.

---

## Tool Results

Every tool returns `ToolResult<T>` — never throws:

```typescript
type ToolResult<T> = ToolSuccess<T> | ToolFailure

type ToolSuccess<T> = { success: true;  data: T }
type ToolFailure    = { success: false; code: ToolErrorCode; message: string }
```

Error codes:

| Code | When |
|---|---|
| `SESSION_NOT_FOUND` | Session ID does not exist |
| `NO_MANIFEST` | Tool requires a manifest but none is set |
| `VALIDATION_FAILED` | Manifest has errors (blocks downstream tools) |
| `NOT_VALIDATED` | Plan requires prior validation |
| `PLAN_NOT_FOUND` | Execute requires a plan |
| `PLAN_STALE` | Manifest changed since plan was built |
| `PLAN_NOT_APPROVED` | Execute requires approval |
| `REVISION_NOT_FOUND` | Rollback target does not exist |
| `PATCH_FAILED` | JSON Patch application error |
| `EXECUTION_FAILED` | Schematics returned failures |
| `INTERNAL_ERROR` | Unexpected error |

LLMs handle structured failures far better than thrown exceptions — error codes are machine-readable, messages are human-readable.

---

## Session Storage

Sessions are persisted to disk by default. The storage backend is injected — swap for Redis or Postgres without touching tool code.

```typescript
// File-backed (default — one JSON file per session)
new FileSessionStore(sessionDir)

// Memory (testing)
new InMemorySessionStore()

// Custom
class RedisSessionStore implements SessionStore {
  async load(id: SessionId): Promise<SessionState | null> { ... }
  async save(session: SessionState): Promise<void> { ... }
  async delete(id: SessionId): Promise<void> { ... }
  async list(): Promise<SessionId[]> { ... }
}
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `AVEROS_SESSION_DIR` | `~/.averos/sessions` | Directory for session JSON files |

---

## Package Structure

```
packages/mcp/
├── src/
│   ├── index.ts                    stdio entry point
│   ├── server.ts                   MCP server + tool wiring + toMcpResponse()
│   ├── session/
│   │   ├── types.ts                SessionState domains + factory + helpers
│   │   ├── manager.ts              SessionManager (store-agnostic)
│   │   └── store/
│   │       ├── types.ts            SessionStore interface
│   │       ├── memory.ts           InMemorySessionStore
│   │       └── file.ts             FileSessionStore (atomic writes)
│   ├── tools/
│   │   ├── types.ts                ToolResult<T>, ok(), fail(), error codes
│   │   ├── schemas.ts              Zod schemas ($sessionId, $jsonPatch, etc.)
│   │   ├── create-session.ts
│   │   ├── get-ir.ts
│   │   ├── update-ir.ts            JSON Patch engine (RFC 6902)
│   │   ├── reset-ir.ts
│   │   ├── diff-ir.ts              Semantic diff via @averos/dag-engine
│   │   ├── validate-ir.ts
│   │   ├── build-plan.ts
│   │   ├── approve-plan.ts
│   │   ├── execute-plan.ts
│   │   ├── get-status.ts
│   │   ├── list-revisions.ts
│   │   └── rollback-revision.ts
│   ├── renderers/
│   │   ├── plan-renderer.ts        ExecutionPlan → human-readable markdown
│   │   ├── error-renderer.ts       ValidationError[] → human-readable markdown
│   │   └── diff-renderer.ts        ChangeSet → human-readable markdown
│   ├── pipeline/
│   │   └── store-factory.ts        Derives stores from session paths
│   └── config/
│       └── types.ts                McpConfig
└── tests/
    ├── session/
    │   ├── manager.test.ts
    │   └── store/
    │       └── memory.test.ts
    ├── tools/
    │   ├── update-ir.test.ts
    │   ├── validate-ir.test.ts
    │   └── build-plan.test.ts
    └── renderers/
        └── plan-renderer.test.ts
```

---

## Testing

```bash
npm test
```

Tests use `InMemorySessionStore` — no filesystem access. All tool tests verify `ToolResult` codes directly.

---


## License

Copyright © 2020-2026 Houssemeddine LAOUITI (Wiforge).

Released under the [MIT LICENSE](../../LICENSE).

---

<p align="center">
  Built with ❤️ by the <a href="https://github.com/wiforge">Wiforge</a> team · Part of the <a href="https://github.com/wiforge/averos">Averos Platform</a>
</p>