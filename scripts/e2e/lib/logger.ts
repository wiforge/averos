// =============================================================================
// scripts/e2e/lib/logger.ts
//
// Per-node execution logger.
//
// Writes one log file per node under logs/:
//   logs/application__create-application.log
//   logs/entity__ToDo__averos-entity.log
//   logs/field__ToDo__title__add-simple-member.log
//
// Also writes a machine-readable structured log:
//   logs/execution-log.jsonl  (one JSON object per line)
// =============================================================================

import * as fs   from 'fs'
import * as path from 'path'
import type { NodeLog } from './types'

export class NodeLogger {

  private readonly jsonlPath: string

  constructor(private readonly logsDir: string) {
    fs.mkdirSync(logsDir, { recursive: true })
    this.jsonlPath = path.join(logsDir, 'execution-log.jsonl')

    // Write header comment to jsonl
    fs.writeFileSync(
      this.jsonlPath,
      '// Averos E2E execution log — one JSON object per line\n',
      'utf-8',
    )
  }

  // ── Write one node log ────────────────────────────────────────────────────

  writeNodeLog(log: NodeLog): void {
    const filename = this.buildFilename(log)
    const filePath = path.join(this.logsDir, filename)

    const content = [
      `# Averos E2E Node Execution Log`,
      `# Generated: ${new Date().toISOString()}`,
      ``,
      `NODE ID    : ${log.nodeId}`,
      `COMMAND    : ${log.command}`,
      `RUNNER     : ${log.runner}`,
      `STARTED    : ${log.startedAt}`,
      `FINISHED   : ${log.finishedAt}`,
      `DURATION   : ${log.durationMs}ms`,
      `EXIT CODE  : ${log.exitCode ?? 'n/a'}`,
      `SUCCESS    : ${log.success}`,
      ``,
      `ARGS:`,
      JSON.stringify(log.args, null, 2),
      ``,
      `FULL COMMAND:`,
      this.buildDisplayCommand(log),
      ``,
      `─── STDOUT ${'─'.repeat(60)}`,
      log.stdout || '(empty)',
      ``,
      `─── STDERR ${'─'.repeat(60)}`,
      log.stderr || '(empty)',
    ].join('\n')

    fs.writeFileSync(filePath, content, 'utf-8')

    // Append to jsonl
    fs.appendFileSync(
      this.jsonlPath,
      JSON.stringify(log) + '\n',
      'utf-8',
    )
  }

  // ── Build a safe filename from node id and command ────────────────────────

  private buildFilename(log: NodeLog): string {
    // Replace characters unsafe for filenames
    const safe = (s: string) =>
      s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80)

    return `${safe(log.nodeId)}__${safe(log.command)}.log`
  }

  // ── Build human-readable command string ───────────────────────────────────

  private buildDisplayCommand(log: NodeLog): string {
    const bin  = log.runner === 'npx-schematics' ? 'npx schematics' : 'ng g'
    const cmd  = `@averos/workflow:${log.command}`
    const flags = Object.entries(log.args)
      .map(([k, v]) => {
        if (v === true)  return `--${k}`
        if (v === false) return ''
        if (Array.isArray(v)) return `--${k}=${v.join(',')}`
        return `--${k}=${v}`
      })
      .filter(Boolean)
      .join(' ')

    return `${bin} ${cmd} ${flags}`
  }

  // ── Write final summary ───────────────────────────────────────────────────

  writeSummary(entries: NodeLog[]): void {
    const summaryPath = path.join(this.logsDir, 'summary.txt')

    const succeeded = entries.filter(e => e.success)
    const failed    = entries.filter(e => !e.success)
    const totalMs   = entries.reduce((sum, e) => sum + e.durationMs, 0)

    const lines = [
      `Averos E2E Execution Summary`,
      `Generated : ${new Date().toISOString()}`,
      ``,
      `Total     : ${entries.length}`,
      `Succeeded : ${succeeded.length}`,
      `Failed    : ${failed.length}`,
      `Duration  : ${totalMs}ms`,
      ``,
      `─── All nodes ${'─'.repeat(57)}`,
      '',
    ]

    for (const entry of entries) {
      const icon    = entry.success ? '✓' : '✗'
      const dur     = `${entry.durationMs}ms`.padStart(8)
      const nodeId  = entry.nodeId.padEnd(60)
      lines.push(`  ${icon} ${nodeId} ${dur}  ${entry.command}`)
    }

    if (failed.length > 0) {
      lines.push('')
      lines.push(`─── Failed nodes ${'─'.repeat(54)}`)
      lines.push('')
      for (const entry of failed) {
        lines.push(`  ✗ ${entry.nodeId}`)
        const errLine = entry.stderr.trim().split('\n').pop() ?? ''
        if (errLine) lines.push(`    → ${errLine}`)
      }
    }

    fs.writeFileSync(summaryPath, lines.join('\n') + '\n', 'utf-8')
  }

  get logsDirectory(): string { return this.logsDir }
}