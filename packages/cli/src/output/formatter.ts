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
// Pure functions that format data structures into terminal strings.
// No I/O — callers decide where to write.
// =============================================================================

import type { ExecutionPlan } from '@averos/dag-engine'
import type { RunnerSummary } from '@averos/executor'
// import { PHASE_ORDER }         from '@averos/dag-engine'

export function formatPlan(plan: ExecutionPlan, json: boolean): string {
  if (json) return JSON.stringify(plan, null, 2)

  const actionable = plan.nodes.filter((n) => n.action !== 'skip')
  const lines: string[] = [
    '',
    `── Execution Plan ──────────────────────────────────`,
    `   Nodes to execute : ${actionable.length}`,
    `   Skipped          : ${plan.nodes.length - actionable.length}`,
    `   Warnings         : ${plan.warnings.length}`,
    '',
    `── Commands ────────────────────────────────────────`,
  ]

  for (const node of actionable) {
    lines.push(
      `   [${node.action.toUpperCase().padEnd(6)}] ` +
        `${node.runner.padEnd(17)} ` +
        `${node.command.padEnd(30)} ` +
        node.id,
    )
  }

  if (plan.warnings.length > 0) {
    lines.push('', `── Warnings ────────────────────────────────────────`)
    for (const w of plan.warnings) {
      lines.push(`   ⚠  [${w.type}] ${w.message}`)
    }
  }

  lines.push(`────────────────────────────────────────────────────`, '')
  return lines.join('\n')
}

export function formatSummary(summary: RunnerSummary, json: boolean): string {
  if (json) return JSON.stringify(summary, null, 2)

  const status = summary.success ? '✓ SUCCESS' : '✗ FAILED'

  const lines: string[] = [
    '',
    `── Execution Summary ───────────────────────────────`,
    `   Status    : ${status}`,
    `   Total     : ${summary.total}`,
    `   Succeeded : ${summary.succeeded}`,
    `   Failed    : ${summary.failed}`,
    `   Skipped   : ${summary.skipped}`,
    `   Cancelled : ${summary.cancelled}`,
    `   Duration  : ${summary.durationMs}ms`,
    `   Mode      : ${summary.mode}`,
  ]

  if (summary.failures.length > 0) {
    lines.push('', `── Failures ────────────────────────────────────────`)
    for (const f of summary.failures) {
      lines.push(`   ${f.nodeId}`)
      lines.push(`   → ${f.message}`)
      if (f.exitCode !== undefined) lines.push(`   → exit ${f.exitCode}`)
    }
  }

  lines.push(`────────────────────────────────────────────────────`, '')
  return lines.join('\n')
}
