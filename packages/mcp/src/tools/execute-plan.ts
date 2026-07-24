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

import {
  orchestrateAndExecuteManifest,
  FileCheckpointStore,
  FileStateStore,
  AngularSchematicsAdapter,
} from '@averos/executor'
import type { OrchestrationConfig } from '@averos/executor'
import { commandRegistry } from '@averos/dag-engine'
import * as crypto from 'crypto'
import type { SessionManager } from '../session/manager'
import { SessionNotFoundError } from '../session/manager'
import {
  isApproved,
  isPlanFresh,
  MAX_EXECUTION_HISTORY,
  type ExecutionRecord,
} from '../session/types'
import { ok, fail, type ToolResult } from './types'

export type ExecutePlanInput = {
  sessionId: string
  /** Override per-session config for this run only. */
  dryRun?: boolean
  mode?: 'strict' | 'resilient'
}

// export type ExecutePlanOutput = {
//   success:    boolean
//   sessionId:  string
//   display:    string
//   executionId?: string
//   summary: {
//     total: number; succeeded: number
//     failed: number; skipped: number; durationMs: number
//   } | null
//   failures: Array<{ nodeId: string; message: string; exitCode?: number }>
// }

export type ExecutePlanData = {
  executionId: string
  display: string
  summary: {
    total: number
    succeeded: number
    failed: number
    skipped: number
    durationMs: number
  }
  failures: Array<{ nodeId: string; message: string; exitCode?: number }>
}

export async function executePlan(
  input: ExecutePlanInput,
  manager: SessionManager,
): Promise<ToolResult<ExecutePlanData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── Guard: plan must exist and be approved ────────────────────────────────
  if (!isPlanFresh(session)) {
    return fail(
      'PLAN_STALE',
      'Plan is stale or missing. The manifest may have changed. ' +
        'Run build_execution_plan to rebuild.',
    )
  }

  if (!isApproved(session)) {
    return fail(
      'PLAN_NOT_APPROVED',
      `Execution plan must be approved before execution. ` +
        `Current approval status: "${session.planning.approval}". ` +
        `Call approve_plan with decision=approve after reviewing the plan.`,
    )
  }

  const executionId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  await manager.patchExecution(input.sessionId, {
    phase: 'running',
    executionId,
    startedAt,
  })

  // ── Reconstruct stores from serialized paths ──────────────────────────────
  const { execution, metadata } = session
  const stateStore = new FileStateStore(execution.statePath)
  const checkpointStore = new FileCheckpointStore(execution.checkpointPath)
  const currentState = await stateStore.load()

  const config: OrchestrationConfig = {
    registry: commandRegistry,
    adapter: new AngularSchematicsAdapter(),
    checkpointStore,
    stateStore,
    workspaceRoot: metadata.workspaceDir,
    mode: input.mode ?? metadata.config.mode,
    dryRun: input.dryRun ?? metadata.config.dryRun,
    timeoutMs: metadata.config.timeoutMs,
    maxAttempts: metadata.config.maxAttempts,
  }

  const summary = await orchestrateAndExecuteManifest(
    session.design.manifest!,
    config,
    currentState,
  )

  const completedAt = new Date().toISOString()
  const record: ExecutionRecord = { executionId, startedAt, completedAt, summary }

  await manager.patchExecution(input.sessionId, {
    phase: summary.success ? 'completed' : 'failed',
    completedAt,
    lastSummary: summary,
    lastError: summary.success ? undefined : summary.failures.map((f) => f.message).join('; '),
    history: [...session.execution.history, record].slice(-MAX_EXECUTION_HISTORY),
  })

  if (!summary.success) {
    return fail(
      'EXECUTION_FAILED',
      `Execution failed: ${summary.failures.length} node(s) failed. ` +
        summary.failures.map((f) => `${f.nodeId}: ${f.message}`).join('; '),
    )
  }

  const display =
    `✅ Execution complete — ${summary.succeeded} operations in ` +
    `${(summary.durationMs / 1000).toFixed(1)}s.` +
    (summary.skipped > 0 ? ` ${summary.skipped} already up to date.` : '')

  return ok({
    executionId,
    display,
    summary: {
      total: summary.total,
      succeeded: summary.succeeded,
      failed: summary.failed,
      skipped: summary.skipped,
      durationMs: summary.durationMs,
    },
    failures: [],
  })
}
