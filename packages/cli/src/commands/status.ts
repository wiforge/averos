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
// averos status
//
// Displays the last known build state of the workspace.
//
// Output includes:
//   - Last build timestamp
//   - Per-node execution state
//   - Counts by status
//   - Whether any nodes are in a FAILED state
//
// Exit codes:
//   0 — state loaded successfully (even if some nodes FAILED)
//   1 — no state found or state is unreadable
// =============================================================================

import * as path from 'path'
import { FileStateStore } from '@averos/executor'
import type { StatusArgs } from '../args/types'
import type { AverosConfig } from '../config/types'
import { colors } from '../output/colors'
import { Spinner } from '../output/spinner'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeStatusRow = {
  nodeId: string
  state: string
  lastRunAt: string
  error?: string
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function statusCommand(args: StatusArgs, config: AverosConfig): Promise<number> {
  const statePath = resolveStatePath(args.workspaceRoot, config)

  const spinner = new Spinner()
  spinner.start('Loading build state…')

  const store = new FileStateStore(statePath)
  const state = await store.load()

  if (!state) {
    spinner.warn('No build state found')
    console.log(
      `\n  ${colors.dim(`Run ${colors.cyan('averos run <manifest>')} to build your application.`)}\n`,
    )
    return 1
  }

  if (args.json) {
    spinner.clear()
    process.stdout.write(JSON.stringify(state, null, 2) + '\n')
    return 0
  }

  // ── Compute counts ─────────────────────────────────────────────────────────
  const rows = buildRows(state.nodeStates)
  const counts = computeCounts(rows)
  // const hasFailed = counts.FAILED > 0
  const failed = rows.filter((r) => r.state === 'FAILED')

  spinner.succeed(`State loaded — ${rows.length} nodes`)

  // ── Header ─────────────────────────────────────────────────────────────────
  // const lines: string[] = [
  //   '',
  //   colors.bold('── Build State ─────────────────────────────────────'),
  //   `   Last built  : ${colors.cyan(formatTimestamp(state.builtAt))}`,
  //   `   Total nodes : ${rows.length}`,
  //   `   ${colors.green(`✓ ${counts.SUCCESS} succeeded`)}   ` +
  //     (hasFailed
  //       ? colors.red(`✗ ${counts.FAILED} failed`)
  //       : colors.dim(`✗ 0 failed`)) +
  //     `   ${colors.dim(`⊘ ${counts.SKIPPED} skipped`)}` +
  //     (counts.CANCELLED > 0 ? `   ${colors.yellow(`⚐ ${counts.CANCELLED} cancelled`)}` : ''),
  //   '',
  // ]
  const lines: string[] = [
    '',
    `  ${colors.bold('Build State')}`,
    `  ${colors.dim('Last built')}  ${formatTimestamp(state.builtAt)}`,
    `  ${colors.dim('Total nodes')} ${rows.length}`,
    '',
    `  ${colors.green('✓')} ${counts.SUCCESS ?? 0} succeeded  ` +
      (counts.FAILED > 0
        ? `${colors.red('✗')} ${counts.FAILED} failed  `
        : `${colors.dim('✗ 0 failed')}  `) +
      `${colors.dim('⊘ ' + (counts.SKIPPED ?? 0) + ' skipped')}`,
    '',
  ]

  // ── Failed nodes (always shown) ────────────────────────────────────────────

  if (failed.length > 0) {
    // lines.push(colors.bold(colors.red('── Failed Nodes ────────────────────────────────────')))
    lines.push(`  ${colors.bold(colors.red('Failed nodes'))}`)
    for (const row of failed) {
      lines.push(`   ${colors.red('✗')} ${row.nodeId}`)
      if (row.error) {
        lines.push(`     ${colors.dim('→')} ${colors.red(row.error)}`)
      }
      // lines.push(`     ${colors.dim('last run:')} ${colors.dim(formatTimestamp(row.lastRunAt))}`)
    }
    lines.push('')
  }

  // ── All nodes (verbose or compact) ────────────────────────────────────────
  if (args.verbose ?? false) {
    // lines.push(colors.bold('── All Nodes ───────────────────────────────────────'))
    lines.push(`  ${colors.bold('All nodes')}`)
    for (const row of rows) {
      lines.push(formatNodeRow(row))
    }
    lines.push('')
  }

  lines.push(colors.dim('────────────────────────────────────────────────────'))
  lines.push('')

  process.stdout.write(lines.join('\n'))
  return 0
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveStatePath(workspaceRoot: string, config: AverosConfig): string {
  return config.statePath ?? path.join(workspaceRoot, '.averos', 'state.json')
}

function buildRows(
  nodeStates: Record<string, { state: string; lastRunAt?: string; error?: string }>,
): NodeStatusRow[] {
  return Object.entries(nodeStates)
    .map(([nodeId, ns]) => ({
      nodeId,
      state: ns.state,
      lastRunAt: ns.lastRunAt ?? '',
      error: ns.error,
    }))
    .sort((a, b) => {
      // Sort by state priority: FAILED first, then by nodeId
      const priority: Record<string, number> = {
        FAILED: 0,
        RUNNING: 1,
        PENDING: 2,
        SKIPPED: 3,
        CANCELLED: 4,
        SUCCESS: 5,
      }
      const ap = priority[a.state] ?? 99
      const bp = priority[b.state] ?? 99
      return ap !== bp ? ap - bp : a.nodeId.localeCompare(b.nodeId)
    })
}

function computeCounts(rows: NodeStatusRow[]): Record<string, number> {
  const counts: Record<string, number> = {
    SUCCESS: 0,
    FAILED: 0,
    SKIPPED: 0,
    CANCELLED: 0,
    PENDING: 0,
    RUNNING: 0,
  }
  for (const row of rows) {
    counts[row.state] = (counts[row.state] ?? 0) + 1
  }
  return counts
}

function formatNodeRow(row: NodeStatusRow): string {
  const icon = stateIcon(row.state)
  const label = row.nodeId.padEnd(52)
  const ts = colors.dim(formatTimestamp(row.lastRunAt))
  return `   ${icon} ${label} ${ts}`
}

function stateIcon(state: string): string {
  switch (state) {
    case 'SUCCESS':
      return colors.green('✓')
    case 'FAILED':
      return colors.red('✗')
    case 'SKIPPED':
      return colors.dim('⊘')
    case 'CANCELLED':
      return colors.yellow('⚐')
    case 'RUNNING':
      return colors.cyan('▶')
    default:
      return colors.dim('·')
  }
}

function formatTimestamp(iso: string): string {
  if (!iso) return 'unknown'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
