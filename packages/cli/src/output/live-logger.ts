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

// =============================================================================
// Live stdout feed during averos run.
//
// Default mode (verbose=false):
//   - Rotating spinner with current node name
//   - One line per phase transition
//   - Success/failure summary lines
//   - Failures printed immediately in red
//
// Verbose mode (verbose=true):
//   - Every node start / success / skip / failure with timing
//   - cwd updates
//   - Debug information (args, checkpoint events)
//
// The spinner is paused before printing any log line and resumed after,
// so log output and the spinner never interleave.
// =============================================================================

import { colors } from './colors'
import { Spinner } from './spinner'
import type { RunnerEventListener } from '@averos/executor'
import type { RunnerEvent } from '@averos/executor'

export type LiveLoggerOptions = {
  verbose: boolean
}

export class LiveLogger implements RunnerEventListener {
  private readonly spinner: Spinner
  private readonly verbose: boolean
  private currentPhase: string = ''
  private nodeCount = 0
  private succeededCount = 0
  private skippedCount = 0
  private failedCount = 0
  private startedAt: number = Date.now()

  constructor(opts: LiveLoggerOptions) {
    this.verbose = opts.verbose
    this.spinner = new Spinner()
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  start(message: string): void {
    this.startedAt = Date.now()
    this.spinner.start(message)
  }

  stop(): void {
    this.spinner.clear()
  }

  succeed(message: string): void {
    this.spinner.succeed(message)
  }

  fail(message: string): void {
    this.spinner.fail(message)
  }

  // ── RunnerEventListener ───────────────────────────────────────────────────

  onEvent(event: RunnerEvent): void {
    switch (event.type) {
      case 'NODE_STARTED': {
        const node = event.node as any
        const phase = node?.phase ?? ''

        // Phase transition header (default + verbose)
        if (phase && phase !== this.currentPhase) {
          this.currentPhase = phase
          this.printLine(`\n  ${colors.bold(colors.cyan(formatPhaseLabel(phase)))}`)
        }

        if (this.verbose) {
          this.printLine(`  ${colors.dim('▶')} ${colors.dim(event.nodeId)}`)
        } else {
          // Update spinner with current node — minimal feedback
          this.spinner.update(
            `${colors.dim(formatPhaseLabel(phase))} › ${colors.dim(shortId(event.nodeId))}`,
          )
        }
        break
      }

      case 'NODE_SUCCEEDED': {
        this.nodeCount++
        this.succeededCount++

        if (this.verbose) {
          const dur = formatDuration(event.durationMs)
          this.printLine(`  ${colors.green('✓')} ${event.nodeId} ${colors.dim(dur)}`)
        }
        break
      }

      case 'NODE_SKIPPED': {
        this.nodeCount++
        this.skippedCount++

        if (this.verbose) {
          this.printLine(
            `  ${colors.dim('⊘')} ${colors.dim(event.nodeId)} ${colors.dim('[' + event.reason + ']')}`,
          )
        }
        break
      }

      case 'NODE_FAILED': {
        this.nodeCount++
        this.failedCount++

        // Always print failures — regardless of verbose mode
        this.printLine(`  ${colors.red('✗')} ${colors.red(event.nodeId)}`)
        if (event.failure?.message) {
          this.printLine(`    ${colors.dim('→')} ${colors.red(event.failure.message)}`)
        }
        break
      }

      case 'RUNNER_COMPLETED': {
        // Spinner is stopped by the calling command — not here
        // so the command can print the final summary line cleanly
        break
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Prints a line to stdout without disrupting the spinner.
   * Clears the spinner line, prints the message, then re-renders the spinner.
   */
  private printLine(line: string): void {
    if (this.spinner.isSpinning && !!process.stdout.isTTY) {
      // Move to start of line and clear it before printing
      process.stdout.write('\r\x1b[K')
    }
    process.stdout.write(line + '\n')
    // Spinner will re-render on next tick automatically
  }

  debug(message: string): void {
    if (this.verbose) {
      this.printLine(`  ${colors.dim('·')} ${colors.dim(message)}`)
    }
  }

  elapsed(): string {
    return formatDuration(Date.now() - this.startedAt)
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    application: 'Application',
    entity: 'Entities',
    'simple-field': 'Fields',
    'composite-field': 'Relationships',
    mapping: 'Mappings',
    validator: 'Validators',
    'service-config': 'Services',
    'use-case': 'Use Cases',
    page: 'Pages',
    auth: 'Authentication',
    translation: 'Languages',
    'translation-entry': 'Translations',
  }
  return labels[phase] ?? phase
}

function shortId(nodeId: string): string {
  // 'entity:ToDoTask' → 'ToDoTask'
  const parts = nodeId.split(':')
  return parts[parts.length - 1] ?? nodeId
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m${s}s`
}
