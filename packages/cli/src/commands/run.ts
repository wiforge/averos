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

import * as fs from 'fs'
import * as path from 'path'
import { parse, defaultValidator, Manifest } from '@averos/dag-engine'
import { orchestrateAndExecuteManifest, isBootstrappable, BootstrapContext } from '@averos/executor'
import type { RunArgs } from '../args/types'
import type { AverosConfig } from '../config/types'
import { buildOrchestrationConfig, InfraOptions, resolveLogsDir } from '../infra/factory'
import { formatSummary } from '../output/formatter'
import { NodeLogger } from '../output/node-logger'
import { LiveLogger } from '../output/live-logger'
import { Spinner } from '../output/spinner'
import { colors } from '../output/colors'

export async function runCommand(args: RunArgs, config: AverosConfig): Promise<number> {
  const liveLogger = new LiveLogger({ verbose: args.verbose })
  const spinner = new Spinner()
  // ── Load manifest ───────────────────────────────────────────────────────────
  const manifestPath = path.resolve(args.workspaceRoot, args.manifestPath)

  if (!fs.existsSync(manifestPath)) {
    console.error(
      `${colors.red('✗')} Manifest not found: ${manifestPath} \nUsing Workspace: ${args.workspaceRoot}`,
    )
    return 1
  }

  liveLogger.debug(`Manifest: ${manifestPath}`)
  liveLogger.debug(`Workspace: ${args.workspaceRoot}`)
  liveLogger.debug(`Mode: ${args.mode} | Dry-run: ${args.dryRun}`)

  let raw: Manifest
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch {
    console.error(`${colors.red('✗')} Failed to parse manifest JSON: ${manifestPath}`)
    return 1
  }

  const manifest = raw

  // ── Validate ────────────────────────────────────────────────────────────────
  const nodes = parse(manifest)
  const result = defaultValidator.validate(nodes)

  if (!result.valid) {
    console.error(`${colors.red('✗')} Manifest validation failed:`)
    result.errors
      .filter((e) => e.severity === 'error')
      .forEach((e) => console.error(`  ${colors.red('✗')} ${e.message}`))
    return 1
  }

  const warnings = result.errors.filter((e) => e.severity === 'warning')
  warnings.forEach((e) => console.warn(`  ${colors.yellow('⚠')}  ${e.message}`))

  if (args.verbose) {
    liveLogger.debug(`Validated ${nodes.length} nodes, ${warnings.length} warning(s)`)
  }

  // ── Build config ───────────────────────────────────────────────────────────
  const logsDir = resolveLogsDir(args.workspaceRoot, args.logsDir ?? config.logsDir)

  const infraOption: InfraOptions = {
    workspaceRoot: args.workspaceRoot,
    mode: args.mode ?? config.mode ?? 'resilient',
    dryRun: args.dryRun,
    verbose: args.verbose,
    timeoutMs: args.timeoutMs,
    maxAttempts: args.maxAttempts,
    localTgz: args.localTgz ?? config.localTgz,
    development: args.development || config.development,
    averosVersion: args.averosVersion ?? config.averosVersion,
    logsDir,
  }

  // ── Load state ──────────────────────────────────────────────────────────────
  const orchConfig = buildOrchestrationConfig(infraOption, config)

  if (!args.dryRun) {
    fs.mkdirSync(args.workspaceRoot, { recursive: true })
    fs.mkdirSync(logsDir, { recursive: true })
    if (isBootstrappable(orchConfig.adapter)) {
      spinner.start('Bootstrapping workspace…')

      const bootstrapCtx: BootstrapContext = {
        timeoutMs: args.timeoutMs ?? config.timeoutMs ?? 120_000,
        logsDir,
        verbose: args.verbose,
        // devRegistry: args.devRegistry ?? config.devRegistry,
      }

      try {
        await orchConfig.adapter.bootstrap(args.workspaceRoot, bootstrapCtx)
        spinner.succeed('Workspace ready')
      } catch (err) {
        spinner.fail(`Bootstrap failed: ${err instanceof Error ? err.message : String(err)}`)
        return 1
      }
    }
  }

  // ── Load state ────────────────────────────────────────────────────────────
  // Load AFTER bootstrap (workspace dir must exist for state file path)
  // Uses null-safe load — returns emptyState() when no prior state exists.
  const state = await orchConfig.stateStore.load()

  if (args.verbose && state) {
    const built = Object.keys(state.nodeStates ?? {}).length
    liveLogger.debug(`Loaded state: ${built} previously built nodes`)
  }
  orchConfig.listeners = [
    liveLogger,
    ...(args.dryRun ? [] : [new NodeLogger(logsDir).asListener()]),
  ]

  const runLabel = args.dryRun
    ? `${colors.yellow('dry-run')} — planning ${nodes.length} nodes`
    : `Executing ${nodes.length} nodes`

  liveLogger.start(runLabel)
  // ── Execute ─────────────────────────────────────────────────────────────────
  const summary = await orchestrateAndExecuteManifest(manifest, orchConfig, state)

  // ── Final status line ──────────────────────────────────────────────────────
  const elapsed = liveLogger.elapsed()

  if (summary.success) {
    liveLogger.succeed(
      summary.skipped > 0
        ? `Done in ${elapsed} — ` +
            `${colors.green(String(summary.succeeded))} executed, ` +
            `${colors.dim(String(summary.skipped))} already built`
        : `Done in ${elapsed} — ` + `${colors.green(String(summary.succeeded))} nodes executed`,
    )
  } else {
    liveLogger.fail(
      `Failed in ${elapsed} — ` +
        `${colors.red(String(summary.failed))} failed, ` +
        `${summary.succeeded} succeeded`,
    )
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  process.stdout.write(formatSummary(summary, false))

  // ── Logs location (real runs only) ────────────────────────────────────────
  if (!args.dryRun) {
    process.stdout.write(`\n  ${colors.dim('Logs:')} ${colors.dim(logsDir)}\n\n`)
  }

  return summary.success ? 0 : 1
}
