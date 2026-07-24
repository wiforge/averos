/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 */

import * as path from 'path'
import * as fs from 'fs'
import type { AverosArgs, RunArgs, PlanArgs } from './args/types'
import { loadConfig } from './config/loader'
import { runCommand } from './commands/run'
import { planCommand } from './commands/plan'
import { generateCommand } from './commands/generate'
import { statusCommand } from './commands/status'
import { colors } from './output/colors'

// ─── Dynamic version from package.json ───────────────────────────────────────

function readCliVersion(): string {
  try {
    // Works both from src/ (ts-node) and dist/ (compiled)
    const candidates = [
      path.join(__dirname, '..', 'package.json'), // dist/bin → packages/cli
      path.join(__dirname, '..', '..', 'package.json'), // src/     → packages/cli
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf-8')) as { version?: string }
        if (pkg.version) return pkg.version
      }
    }
  } catch {
    /* ignore */
  }
  return '0.0.0'
}

export const CLI_VERSION = readCliVersion()

export async function routeCommand(args: AverosArgs): Promise<number> {
  // ── Load config file ───────────────────────────────────────────────────────
  // Config is resolved relative to workspaceRoot (which may still be cwd here).
  // We load it first so we can apply its values as fallbacks.
  const config = loadConfig(args.workspaceRoot, args.configPath)

  // ── Apply config fallbacks ─────────────────────────────────────────────────
  // CLI flags always win. Config file fills gaps. Hardcoded defaults are last.

  const workspaceRoot =
    args.workspaceRoot !== process.cwd() // was explicitly set via --workspace
      ? args.workspaceRoot
      : (config.workspaceRoot ?? args.workspaceRoot)

  // ── Resolve all RunArgs config fallbacks here — before dispatch ───────────
  // This ensures commands always receive fully-resolved args regardless of
  // whether values came from CLI flags or the config file.
  let resolved: AverosArgs = { ...args, workspaceRoot }

  // Re-apply workspaceRoot so commands see the resolved value
  // args = { ...args, workspaceRoot }

  // Resolve manifestPath for commands that use it
  if (resolved.command === 'run' || resolved.command === 'plan') {
    // const resolved = args as RunArgs | PlanArgs
    const manifestPath =
      resolved.manifestPath && !resolved.manifestPath.startsWith('--')
        ? resolved.manifestPath
        : (config.manifestPath ?? 'averos-app.json')

    resolved = { ...resolved, manifestPath }
  }
  if (resolved.command === 'run') {
    resolved = {
      ...resolved,
      mode: resolved.mode ?? config.mode ?? 'resilient',
      localTgz: resolved.localTgz ?? config.localTgz,
      development: resolved.development ?? config.development,
      averosVersion: resolved.averosVersion ?? config.averosVersion,
      logsDir: resolved.logsDir ?? config.logsDir,
      timeoutMs: resolved.timeoutMs ?? config.timeoutMs,
      maxAttempts: resolved.maxAttempts ?? config.maxAttempts ?? 1,
    } as RunArgs
  }

  switch (resolved.command) {
    case 'run':
      return runCommand(resolved as RunArgs, config)
    case 'plan':
      return planCommand(resolved as PlanArgs, config)
    case 'generate':
      return generateCommand(resolved, config)
    case 'status':
      return statusCommand(resolved, config)
    case 'help':
    default:
      printHelp()
      return 0
  }
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${colors.bold(`Averos CLI`)} ${colors.dim(`v${CLI_VERSION}`)}

${colors.bold('Usage:')}
  averos ${colors.cyan('run')}   [<manifest>] [options]
  averos ${colors.cyan('plan')}  [<manifest>] [options]
  averos ${colors.cyan('status')}             [options]
  averos ${colors.cyan('generate')} "<intent>" [options]

${colors.bold('Commands:')}
  ${colors.cyan('run')}       Execute a manifest against a workspace (real or dry-run)
  ${colors.cyan('plan')}      Preview the execution plan without running anything
  ${colors.cyan('status')}    Show the last build state for a workspace
  ${colors.cyan('generate')}  Generate a manifest from natural language (requires @averos/ai)

${colors.bold('Run options:')}
  --manifest=<path>          Manifest file path
  --mode=resilient|strict    Execution mode ${colors.dim('(default: resilient)')}
  --dry-run                  Preview commands without executing
  --resume                   Resume from last checkpoint on failure
  --timeout=<ms>             Per-session timeout in milliseconds
  --max-attempts=<n>         Retry attempts per node ${colors.dim('(default: 1)')}
  --tgz=<path>               Path to local @averos/workflow .tgz
                             (installs from npm registry when omitted)
  --development              development mode
  --averos-version=<semver>  Version string ${colors.dim('(required with --development)')}
  --logs-dir=<path>          Directory for per-node execution logs
                             ${colors.dim('(default: <workspace>/logs)')}

${colors.bold('Plan options:')}
  --manifest=<path>          Manifest file path
  --json                     Output plan as JSON

${colors.bold('Generate options:')}
  --run                      Execute the generated manifest immediately
  --output=<path>            Where to write the generated manifest
                             (default: averos-app.json)

${colors.bold('Global options:')}
  --workspace=<path>         Workspace root ${colors.dim('(default: cwd)')}
  --config=<path>            Config file ${colors.dim('(default: averos.config.json)')}
  --verbose                  Debug output — all node names, paths, timings

${colors.bold('Examples:')}

  ${colors.dim('# Using a config file:')}
  averos run --config=/my/project/averos.config.json --dry-run

  ${colors.dim('# Real run from npm registry:')}
  averos run app.json --workspace=/tmp/myapp

  ${colors.dim('# Real run from npm local registry (ex. Verdaccio):')}
  AVEROS_DEV_REGISTRY=http://localhost:4873 averos run app.json --workspace=/tmp/myapp

  ${colors.dim('# Real run from local tgz:')}
  averos run app.json --workspace=/tmp/myapp \\
    --development
    --tgz=./averos-lib-2.0.0.tgz \\
    --averos-version=2.0.0

  ${colors.dim('# Dry-run:')}
  averos run app.json --workspace=/tmp/myapp --dry-run

  ${colors.dim('# Preview plan as JSON:')}
  averos plan app.json --workspace=/tmp/myapp --json

  ${colors.dim('# Show last build status:')}
  averos status --workspace=/tmp/myapp
`)
}
