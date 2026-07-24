# Averos Integration Tests

Integration tests validate interactions between major internal subsystems:

- DAG engine
- executor
- AI orchestration
- validation
- checkpointing
- state persistence

Unlike smoke tests, integration tests execute real orchestration logic
and verify stateful runtime behavior.

---

# Test Matrix

| Script | Purpose |
|---|---|
| `integration-test-executor.sh` | Validates orchestration runtime, state persistence, checkpoints, and idempotency |
| `integration-test-ai.sh` | Validates AI manifest generation, retry logic, conversation sessions, and execution handoff |

---

# What Is Validated

## Executor Integration

The executor integration suite validates:

- manifest parsing
- DAG generation
- dependency ordering
- orchestration execution
- execution summaries
- state persistence
- checkpoint lifecycle
- idempotency
- replay safety
- dry-run semantics

## AI Integration

The AI integration suite validates:

- manifest generation from prompts
- validation feedback loop
- retry behavior
- invalid manifest rejection
- multi-turn conversation sessions
- manifest mutation across turns
- execution pipeline handoff

---

# Directory Structure

```text
scripts/
├── integration/
│   ├── integration-test-ai.ts
│   ├── integration-test-ai.sh
│   ├── integration-test-executor.ts
│   └── integration-test-executor.sh
│
└── golden-reference/
    └── todoapp-manifest.json
```

---

# Running Individual Tests

## Executor Integration

```bash
pnpm run integration:executor
```

## AI Integration

```bash
pnpm run integration:ai
```

---

# Running the Entire Integration Suite

```bash
pnpm run integration:all
```

---

# Redirecting Output to Console + Log File

## Linux / macOS

```bash
pnpm run integration:all 2>&1 | tee integration.log
```

## Timestamped Logs

```bash
pnpm run integration:all 2>&1 | tee "integration-$(date +%Y%m%d-%H%M%S).log"
```

---

# CI Usage

Integration tests should run:

- after smoke tests
- before E2E tests
- before release builds

Recommended pipeline:

```text
smoke -> integration -> e2e
```

---

# Expected Runtime

| Suite | Approx Runtime |
|---|---|
| Executor integration | ~5–15 seconds |
| AI integration | ~5–10 seconds |
| Full integration suite | ~15–30 seconds |

---

# Failure Characteristics

Integration failures usually indicate:

- orchestration regressions
- invalid state transitions
- checkpoint corruption
- persistence bugs
- validator inconsistencies
- AI retry pipeline issues
- execution summary mismatches

---

# Notes

Integration tests intentionally use:

- mock adapters
- in-memory stores
- deterministic manifests

to ensure fast and reproducible execution.