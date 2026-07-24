# Averos E2E Test Suite

## Overview

The `scripts/e2e/` suite provides full end-to-end validation of the Averos orchestration pipeline against a real Angular workspace.

Unlike smoke or integration tests, these E2E tests:

* bootstrap a real Angular application,
* install the real `@averos/workflow` package,
* execute actual schematics,
* validate generated workspace structure,
* verify state persistence,
* validate checkpoint recovery,
* and ensure full idempotency across reruns.

The suite is designed for:

* local development validation,
* CI/CD verification,
* npm registry release validation,x	
* regression testing,
* and orchestration reliability testing.

This is the highest-confidence validation layer in the repository.

---

# Directory Structure

```text
scripts/e2e/
├── run-real-angular.sh          ← remote/CI harness (installs from npm registry)
├── run-real-angular.ts          ← shared TypeScript E2E runner
├── run-local-angular.sh         ← local/dev harness (installs from .tgz)
│
├── lib/
│   ├── workspace.ts             ← workspace setup utilities (bootstrap, install, cd)
│   ├── logger.ts                ← per-node file logger + structured log writer
│   ├── assertions.ts            ← all assertion helpers (plan, summary, files)
│   ├── harness-common.sh        ← reusable shell harness utilities
│   └── types.ts                 ← shared E2E TypeScript types
│
├── fixtures/
│   └── .gitkeep
│
└── golden-reference/
    └── todoapp-manifest.json
```

---

# Test Matrix

The E2E runner performs the following validations:

| # | Test                        | Description                                                                            				  |
| - | --------------------------- | ------------------------------------------------------------------------------------------------------|
| 1 | Manifest Validation         | Ensures the manifest parses correctly and passes all DAG validation rules              				  |
| 2 | Execution Plan Invariants   | Validates dependency ordering, phase ordering, node integrity, and conflict-free plans 				  |
| 3 | Real execution			  | Every schematic in the golden reference runs without error in a real Angular workspace 				  |
| 4 | Full Pipeline Execution     | Executes the full orchestration pipeline using real schematics                         				  |
| 5 | State Persistence           | Ensures execution state is persisted correctly after execution (No stale checkpoints after clean run) |
| 6 | Checkpoint Cleanup          | Ensures checkpoints are fully cleared after successful completion                      				  |
| 7 | Workspace Structure         | Angular generated a valid workspace (angular.json, tsconfig.json, src/app)             				  |
| 8 | Idempotency                 | Ensures a second run against saved state performs zero re-executions   			    				  |
| 9 | Checkpoint Recovery         | Ensures partially completed executions resume correctly                                				  |
																																		     
---

# Execution Modes

The suite supports two installation modes.

---

## 1. Remote / CI Mode

Uses the published npm registry package.

### Harness

```bash
bash scripts/e2e/run-real-angular.sh
```

### What It Does

* installs `@averos/workflow` from npm,
* bootstraps a real Angular application,
* executes the orchestration pipeline,
* validates generated output.

### Intended Usage

* CI pipelines
* release validation
* npm registry verification
* production regression testing

---

## 2. Local Development Mode

Uses a locally built `.tgz` package instead of npm registry.

### Harness

```bash
bash scripts/e2e/run-local-angular.sh \
  --tgz=./wiforge-averos-2.0.0.tgz \
  --averos-version=2.0.0
```

```bash
# Dry-run first to verify the pipeline without touching schematics:
bash scripts/e2e/run-local-angular.sh \
  --tgz=./wiforge-averos-2.0.0.tgz \
  --averos-version=2.0.0 \
  --dry-run \
  --keep-workspace
```


### What It Does

* installs a local `.tgz`,
* enables development schematic flags,
* validates unpublished local changes before release.

### Local Install Flow

The local harness installs Averos using:

```bash
npm install averos-workflow-2.0.0.tgz
```

Then bootstraps the workspace with:

```bash
npx schematics @averos/workflow:create-application \
  --development \
  --averos-version 2.0.0
```

This allows validating unpublished local builds before publishing to npm.

### Intended Usage

* local schematic development
* pre-release testing
* debugging
* rapid iteration

---

# Running Tests

## Standard E2E Run

```bash
npm run e2e
```

Equivalent to:

```bash
bash scripts/e2e/run-real-angular.sh
```

---

# Available npm Scripts

| Script                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| `pnpm run e2e`            | Run full E2E suite using npm registry package |
| `pnpm run e2e:keep`       | Preserve temporary workspace after execution  |
| `pnpm run e2e:skip-build` | Skip local package build step                 |
| `pnpm run e2e:dry`        | Run orchestration in dry-run mode             |

---

# Harness Options

Both harnesses support the following options.

| Option              | Description                                  |
| ------------------- | -------------------------------------------- |
| `--skip-build`      | Skip package build step                      |
| `--keep-workspace`  | Preserve temporary workspace after execution |
| `--dry-run`         | Use mock adapter instead of real schematics  |
| `--timeout=<ms>`    | Override execution timeout                   |
| `--manifest=<path>` | Use a custom manifest                        |

---

# Examples

## Run Full CI Validation

```bash
bash scripts/e2e/run-real-angular.sh
```

---

## Run Dry-Run Validation

```bash
bash scripts/e2e/run-real-angular.sh --dry-run
```

---

## Preserve Workspace for Debugging

```bash
bash scripts/e2e/run-real-angular.sh --keep-workspace
```

---

## Use a Custom Manifest

```bash
bash scripts/e2e/run-real-angular.sh \
  --manifest=./my-manifest.json
```

---

## Local Development Validation

```bash
bash scripts/e2e/run-local-angular.sh
```

---

# Logs & Results

The E2E suite produces structured logs and machine-readable outputs.

## Temporary Workspace Structure

```text
/tmp/averos-e2e-XXXXXX/
├── workspace/
├── logs/
├── .averos/
└── e2e-results.json
```

---

# Generated Logs

## Per-Node Logs

Each executed orchestration node generates an individual log file:

```text
logs/application__create-application.log
logs/entity__Todo__averos-entity.log
logs/field__Todo__title__add-simple-member.log
```

Each log contains:

* command details,
* execution timing,
* arguments,
* stdout,
* stderr,
* exit codes,
* execution result.

---

## Structured JSONL Log

```text
logs/execution-log.jsonl
```

Contains one JSON object per executed node.

Useful for:

* CI ingestion,
* analytics,
* debugging,
* execution replay,
* observability tooling.

---

## Execution Summary

```text
logs/summary.txt
```

Contains:

* execution totals,
* success/failure counts,
* timing,
* node-by-node summaries.

---

# Results File

```text
e2e-results.json
```

Machine-readable test summary:

```json
{
  "success": true,
  "totalDurationMs": 12345,
  "workspaceDir": "...",
  "logsDir": "...",
  "tests": [...]
}
```

---

# Redirecting Output to Files

## Capture Console Output

```bash
npm run e2e > output.stdout 2>&1
```

---

## Capture Output While Streaming to Console

```bash
npm run e2e 2>&1 | tee e2e.log
```

## Timestamped Logs

```bash
npm run e2e 2>&1 | tee "e2e-$(date +%Y%m%d-%H%M%S).log"
```

---

## Save CI Logs

```bash
bash scripts/e2e/run-real-angular.sh \
  --keep-workspace \
  2>&1 | tee artifacts/e2e.log
```

---

# Dry-Run Mode

Dry-run mode validates orchestration logic without executing real schematics.

Enabled with:

```bash
--dry-run
```

In this mode:

* no Angular generators are executed,
* node execution is mocked,
* orchestration/state/checkpoint logic is still validated.

Useful for:

* orchestration debugging,
* fast CI checks,
* DAG validation,
* checkpoint testing.

---

# Idempotency Validation

The suite explicitly validates that rerunning the same manifest:

* reuses saved state,
* skips already completed nodes,
* performs zero re-executions.

This guarantees orchestration determinism.

---

# Checkpoint Recovery Validation

The suite also validates resumability behavior by:

* pre-seeding checkpoint state,
* simulating interrupted execution,
* ensuring previously completed nodes are skipped.

This verifies reliable recovery semantics.

---

# CI Recommendations

Recommended CI usage:

```bash
npm run e2e
```

Recommended release validation:

```bash
npm run e2e && npm publish
```

Recommended local debugging:

```bash
npm run e2e:keep
```

---

# Troubleshooting

## Angular CLI Not Found

Ensure Angular CLI is installed:

```bash
npm install -g @angular/cli
```

---

## Workspace Preserved for Inspection

When using:

```bash
--keep-workspace
```

the harness prints:

```text
Workspace preserved: /tmp/averos-e2e-XXXXXX
```

You can inspect:

* generated Angular files,
* node logs,
* state files,
* checkpoints,
* execution summaries.

---

# Design Goals

The E2E suite is designed to validate:

* orchestration correctness,
* execution determinism,
* resumability,
* real schematic compatibility,
* Angular workspace integrity,
* release safety,
* and production-grade reliability.

It acts as the final validation layer before publishing or release.


---

# Fixtures

The `fixtures/` directory is reserved for future E2E manifests:

```text
fixtures/
├── minimal-app.json
├── full-auth-app.json
└── composite-relations.json
```

The canonical golden reference manifest remains:

```text
scripts/golden-reference/todoapp-manifest.json
```

and is shared across all test layers.

---

# Architecture Philosophy

The Averos testing strategy follows a layered validation model:

```text
Smoke Tests
    ↓
Integration Tests
    ↓
End-to-End Tests
```

Each layer increases confidence while also increasing execution cost.

This structure ensures:

- fast local feedback
- deterministic orchestration validation
- high-confidence release verification
- reproducible CI behavior