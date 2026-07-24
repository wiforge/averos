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
// Per-node execution logger for averos run.
//
// Writes one log file per node:
//   <logsDir>/<nodeId>__<command>.log
//
// Also writes:
//   <logsDir>/execution-log.jsonl  — structured JSONL for tooling
//   <logsDir>/summary.txt          — human-readable final summary
// =============================================================================

import * as fs from 'fs'
import * as path from 'path'
import type { RunnerEventListener } from '@averos/executor'
import type { RunnerEvent } from '@averos/executor'

type NodeRecord = {
  nodeId: string
  command: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  success?: boolean
  exitCode?: number
  error?: string
}

export class NodeLogger {
  private readonly jsonlPath: string
  private readonly records = new Map<string, NodeRecord>()

  constructor(private readonly logsDir: string) {
    fs.mkdirSync(logsDir, { recursive: true })
    this.jsonlPath = path.join(logsDir, 'execution-log.jsonl')
    // Truncate / create fresh log for this run
    fs.writeFileSync(this.jsonlPath, '', 'utf-8')
  }

  asListener(): RunnerEventListener {
    return { onEvent: (event: RunnerEvent) => this.onEvent(event) }
  }

  private onEvent(event: RunnerEvent): void {
    switch (event.type) {
      case 'NODE_STARTED': {
        const record: NodeRecord = {
          nodeId: event.nodeId,
          command: (event.node as any).command ?? '',
          startedAt: new Date().toISOString(),
        }
        this.records.set(event.nodeId, record)
        this.writeNodeLogHeader(record)
        break
      }

      case 'NODE_SUCCEEDED': {
        const record = this.records.get(event.nodeId)
        if (record) {
          record.finishedAt = new Date().toISOString()
          record.durationMs = event.durationMs
          record.success = true
          this.appendNodeLogFooter(record)
          this.appendJsonl(record)
        }
        break
      }

      case 'NODE_FAILED': {
        const record = this.records.get(event.nodeId)
        if (record) {
          record.finishedAt = new Date().toISOString()
          record.durationMs = event.durationMs
          record.success = false
          record.exitCode = event.failure?.exitCode
          record.error = event.failure?.message
          this.appendNodeLogFooter(record)
          this.appendJsonl(record)
        }
        break
      }

      case 'NODE_SKIPPED': {
        const record: NodeRecord = {
          nodeId: event.nodeId,
          command: '',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0,
          success: true,
        }
        this.records.set(event.nodeId, record)
        this.appendJsonl(record)
        break
      }
    }
  }

  flush(): void {
    this.writeSummary()
  }

  // ── Per-node log files ────────────────────────────────────────────────────

  private nodeLogPath(record: NodeRecord): string {
    const safe = (s: string) =>
      s
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80)
    return path.join(this.logsDir, `${safe(record.nodeId)}__${safe(record.command)}.log`)
  }

  private writeNodeLogHeader(record: NodeRecord): void {
    const content = [
      `Node ID   : ${record.nodeId}`,
      `Command   : ${record.command}`,
      `Started   : ${record.startedAt}`,
      ``,
    ].join('\n')
    fs.writeFileSync(this.nodeLogPath(record), content, 'utf-8')
  }

  private appendNodeLogFooter(record: NodeRecord): void {
    const content =
      [
        `Finished  : ${record.finishedAt ?? ''}`,
        `Duration  : ${record.durationMs ?? 0}ms`,
        `Success   : ${record.success ?? false}`,
        record.exitCode !== undefined ? `Exit code : ${record.exitCode}` : '',
        record.error !== undefined ? `Error     : ${record.error}` : '',
      ]
        .filter(Boolean)
        .join('\n') + '\n'
    fs.appendFileSync(this.nodeLogPath(record), content, 'utf-8')
  }

  // ── JSONL ─────────────────────────────────────────────────────────────────

  private appendJsonl(record: NodeRecord): void {
    fs.appendFileSync(this.jsonlPath, JSON.stringify(record) + '\n', 'utf-8')
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  private writeSummary(): void {
    const all = [...this.records.values()]
    const succeeded = all.filter((r) => r.success === true)
    const failed = all.filter((r) => r.success === false)
    const totalMs = all.reduce((sum, r) => sum + (r.durationMs ?? 0), 0)

    const lines = [
      `Averos Execution Summary`,
      `Generated : ${new Date().toISOString()}`,
      ``,
      `Total     : ${all.length}`,
      `Succeeded : ${succeeded.length}`,
      `Failed    : ${failed.length}`,
      `Duration  : ${totalMs}ms`,
      ``,
    ]

    for (const r of all) {
      const icon = r.success ? '✓' : r.success === false ? '✗' : '⊘'
      const dur = r.durationMs !== undefined ? `${r.durationMs}ms` : 'skipped'
      lines.push(`  ${icon} ${r.nodeId.padEnd(60)} ${dur.padStart(8)}`)
    }

    if (failed.length > 0) {
      lines.push('', '── Failures ────────────────────────────────────────')
      for (const r of failed) {
        lines.push(`  ✗ ${r.nodeId}`)
        if (r.error) lines.push(`    → ${r.error}`)
      }
    }

    fs.writeFileSync(path.join(this.logsDir, 'summary.txt'), lines.join('\n') + '\n', 'utf-8')
  }
}
