# @averos/cli

> The command-line interface for Averos. Run, plan, inspect, and generate Angular applications from manifests — with live progress, per-node logging, and full config-file support.

---

## Overview

`@averos/cli` wraps the full Averos pipeline behind four commands:

| Command | Description |
|---|---|
| `averos run` | Execute a manifest against a workspace |
| `averos plan` | Preview the execution plan without running anything |
| `averos status` | Show the last build state for a workspace |
| `averos generate` | Generate a manifest from natural language (requires `@averos/ai`) |

---

## Installation

```bash
# From the monorepo root
npm run build -w packages/cli

# Or globally (after publishing)
npm install -g @averos/cli
```

---

## Usage

### `averos run`

Executes a manifest against a workspace. Installs `@averos/workflow`, creates the Angular application, and runs all schematics in dependency order.

```bash
# Basic run (installs from npm registry)
averos run app.json --workspace=/path/to/workspace

# Dry-run — preview without executing
averos run app.json --workspace=/path/to/workspace --dry-run

# Local .tgz (for pre-release testing)
averos run app.json \
  --workspace=/path/to/workspace \
  --tgz=/path/to/wiforge-averos-2.0.0.tgz \
  --averos-version=2.0.0

# Strict mode — stop on first failure
averos run app.json --workspace=/path/to/workspace --mode=strict

# Verbose — all node names, paths, timings
averos run app.json --workspace=/path/to/workspace --verbose

# Using a config file (no flags needed)
averos run --config=/path/to/averos.config.json
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--manifest=<path>` | positional arg | Manifest file path |
| `--workspace=<path>` | `cwd` | Workspace root directory |
| `--mode=resilient\|strict` | `resilient` | Execution mode |
| `--dry-run` | `false` | Preview without executing |
| `--resume` | `false` | Resume from last checkpoint |
| `--timeout=<ms>` | — | Per-session timeout |
| `--max-attempts=<n>` | `1` | Retry attempts per node |
| `--tgz=<path>` | — | Local `.tgz` (skips registry install) |
| `--averos-version=<v>` | — | Version string (required with `--tgz`) |
| `--logs-dir=<path>` | `<workspace>/logs` | Per-node execution logs directory |
| `--verbose` | `false` | Debug output |

---

### `averos plan`

Builds and displays the execution plan without running anything. Shows what will be created, updated, or skipped.

```bash
# Table output
averos plan app.json --workspace=/path/to/workspace

# JSON output (machine-readable)
averos plan app.json --workspace=/path/to/workspace --json
```

---

### `averos status`

Shows the last known build state for a workspace.

```bash
averos status --workspace=/path/to/workspace

# JSON output
averos status --workspace=/path/to/workspace --json

# All nodes (not just failed)
averos status --workspace=/path/to/workspace --verbose
```

---

### `averos generate`

Generates a manifest from natural language using an LLM, then optionally executes it.

```bash
# Generate manifest only
averos generate "A task management app with ToDo items" \
  --output=/path/to/manifest.json

# Generate and execute (dry-run)
averos generate "A blog with posts and comments" \
  --output=/path/to/manifest.json \
  --run \
  --dry-run

# Generate and execute with local library
averos generate "A project management app" \
  --output=/path/to/manifest.json \
  --run \
  --tgz=/path/to/wiforge-averos-2.0.0.tgz \
  --averos-version=2.0.0
```

Requires `@averos/ai` and a configured LLM provider.

---

## Config File

All CLI options can be set in `averos.config.json` to avoid repeating them on every invocation.

**Priority:** CLI flag > config file > hardcoded default

```json
{
  "workspaceRoot":   "/path/to/workspace",
  "manifestPath":    "/path/to/app.json",
  "mode":            "resilient",
  "timeoutMs":       600000,
  "maxAttempts":     1,
  "statePath":       "/path/to/state.json",
  "checkpointPath":  "/path/to/checkpoints.json",
  "logsDir":         "/path/to/logs",
  "localTgz":        "/path/to/wiforge-averos-2.0.0.tgz",
  "averosVersion":   "2.0.0",
  "llmProvider":     "ollama",
  "ollamaBaseUrl":   "http://192.168.1.50:11434",
  "ollamaModel":     "qwen2.5-coder:7b"
}
```

Use it:

```bash
averos run --config=/path/to/averos.config.json --dry-run
```

---

## Output

### Default mode

Minimal feedback — spinner with current operation, phase transitions, failures, final summary:

```
  ✓ Workspace ready

  Application
  ✗ application:ToDoApp
    → spawn npx ENOENT

── Execution Summary ────────────────────────────────
   Status    : ✗ FAILED
   Total     : 320
   Succeeded : 0
   Failed    : 1
   ...
```

### Verbose mode (`--verbose`)

Every node with timing, cwd updates, debug info:

```
  · Provider : ollama → http://localhost:11434
  · Manifest : /path/to/app.json
  · Workspace: /tmp/myapp

  Application
  ✓ application:ToDoApp (2341ms)

  Entities
  ✓ entity:ToDoArea (1823ms)
  ✓ entity:ToDoTask (1654ms)

  Fields
  ✓ simple-field:ToDoArea:name (412ms)
  ...
```

### Dry-run

```
  ⊘ dry-run — planning 320 nodes
  ✓ Done in 42ms — 320 nodes planned (0 executed)

── Execution Summary ────────────────────────────────
   Status    : ✓ SUCCESS (dry-run)
   Total     : 320
   ...
```

---

## Logs

In real runs (not dry-run), the CLI writes:

```
<workspace>/logs/
  install-averos.log            npm install output
  create-application.log        bootstrap schematic output
  execution-plan.json           full plan as JSON
  execution-log.jsonl           one JSON line per node
  summary.txt                   human-readable final summary
  application__create-application.log   per-node stdout/stderr
  entity__ToDoTask__averos-entity.log
  ...
```

Override log location:

```bash
averos run app.json --workspace=/tmp/myapp --logs-dir=/var/log/averos
```

---

## Workspace Bootstrap

Before any schematics run, the CLI installs `@averos/workflow` in the workspace directory so `npx schematics` can find it:

**Registry install:**
```bash
npm install @averos/workflow --legacy-peer-deps
```

**Local .tgz install:**
```bash
npm install /path/to/averos-workflow-2.0.0.tgz --legacy-peer-deps
```

The tgz is also copied into the workspace so the `create-application` schematic can reinstall it inside the generated app directory.

In `--dry-run` mode, the bootstrap step is **skipped entirely** — no filesystem writes occur.

---

## LLM Providers (for `generate`)

| Provider | Config key | Env variable |
|---|---|---|
| Anthropic Claude | `"llmProvider": "anthropic"` | `ANTHROPIC_API_KEY` |
| Google Gemini | `"llmProvider": "gemini"` | `GEMINI_API_KEY` |
| OpenAI | `"llmProvider": "openai"` | `OPENAI_API_KEY` |
| Ollama (local) | `"llmProvider": "ollama"` | — |
| LM Studio / LocalAI | `"llmProvider": "local"` | — |

For remote Ollama (e.g. on a LAN server or VM host):

```json
{
  "llmProvider":   "ollama",
  "ollamaBaseUrl": "http://192.168.1.50:11434",
  "ollamaModel":   "qwen2.5-coder:7b"
}
```

---

## Package Structure

```
packages/cli/
├── bin/
│   └── averos.ts              Executable entry point
├── src/
│   ├── index.ts               Command router + version + help
│   ├── commands/
│   │   ├── run.ts             averos run
│   │   ├── plan.ts            averos plan
│   │   ├── status.ts          averos status
│   │   └── generate.ts        averos generate
│   ├── args/
│   │   ├── parser.ts          argv → typed AverosArgs
│   │   └── types.ts           RunArgs, PlanArgs, StatusArgs, GenerateArgs
│   ├── config/
│   │   ├── loader.ts          Loads averos.config.json
│   │   └── types.ts           AverosConfig
│   ├── infra/
│   │   ├── factory.ts         Builds OrchestrationConfig
│   │   └── workspace-bootstrap.ts  npm install + tgz copy
│   └── output/
│       ├── colors.ts          ANSI color utilities
│       ├── formatter.ts       Plan and summary formatters
│       ├── spinner.ts         Rotating cursor spinner
│       ├── live-logger.ts     Live stdout feed during execution
│       ├── progress.ts        RunnerEventListener bridge
│       └── node-logger.ts     Per-node log file writer
└── tests/
    └── commands/
        ├── run.test.ts
        └── plan.test.ts
```

---

## Testing

```bash
npm test
```

---

## License

Copyright © 2020-2026 Houssemeddine LAOUITI (Wiforge).

Released under the [MIT LICENSE](../../LICENSE).

---

<p align="center">
  Built with ❤️ by the <a href="https://github.com/wiforge">Wiforge</a> team · Part of the <a href="https://github.com/wiforge/averos">Averos Platform</a>
</p>