# Averos Smoke Tests

Fast validation suite for the Averos CLI and orchestration pipeline.

Smoke tests execute quickly and validate that the core CLI entrypoints,
manifest parsing, validation, orchestration, and dry-run execution behave
correctly.

These tests are designed to fail fast before running heavier integration
or E2E suites.

---

# Test Matrix

| Script | Purpose |
|---|---|
| `minimal-plan.sh` | Validates minimal manifest planning and JSON output |
| `minimal-run.sh` | Validates dry-run execution pipeline using a minimal manifest |
| `golden-reference-plan.sh` | Validates orchestration planning using the canonical golden reference manifest |
| `golden-reference-run.sh` | Validates full dry-run execution using the canonical golden reference manifest |

---

# What Is Validated

The smoke suite validates:

- CLI argument parsing
- Manifest loading
- Manifest validation
- DAG generation
- Topological ordering
- Dependency invariants
- JSON formatter output
- Dry-run execution
- Summary reporting
- Exit codes
- Idempotent planning behavior
- Prevention of state persistence during dry-run

---

# Directory Structure

```text
scripts/
├── smoke/
│   ├── minimal-plan.sh
│   ├── minimal-run.sh
│   ├── golden-reference-plan.sh
│   ├── golden-reference-run.sh
│
└── golden-reference/
    └── todoapp-manifest.json
```

---

# Running Individual Tests

## Minimal Plan

```bash
pnpm run smoke:plan
```

## Minimal Run

```bash
pnpm run smoke:run
```

## Golden Reference Plan

```bash
pnpm run smoke:gr-plan
```

## Golden Reference Run

```bash
pnpm run smoke:gr-run
```

---

# Running the Entire Smoke Suite

```bash
pnpm run smoke:all
```

---

# Redirecting Output to Console + Log File

## Linux / macOS

```bash
pnpm run smoke:all 2>&1 | tee smoke.log
```

## Timestamped Log File

```bash
pnpm run smoke:all 2>&1 | tee "smoke-$(date +%Y%m%d-%H%M%S).log"
```

---

# CI Usage

Smoke tests are intended to run:

- on every pull request
- before integration tests
- before publishing packages
- before running expensive E2E suites

Recommended CI order:

```text
smoke -> integration -> e2e
```

---

# Expected Runtime

| Suite | Approx Runtime |
|---|---|
| Individual test | < 5 seconds |
| Full smoke suite | ~10–20 seconds |

---

# Failure Characteristics

A smoke test failure usually indicates one of:

- broken CLI entrypoint
- invalid manifest parsing
- orchestration regression
- formatter regression
- validator regression
- dry-run execution issue

Smoke tests should remain deterministic and extremely fast.

---

# Notes

The golden reference manifest is shared across:

- smoke tests
- integration tests
- E2E tests

This guarantees deterministic orchestration behavior across all test layers.