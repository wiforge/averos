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

import type { SessionManager } from '../session/manager'
import { SessionNotFoundError } from '../session/manager'
import { derivePhaseLabel, isPlanFresh } from '../session/types'
import { ok, fail, type ToolResult } from './types'

export type GetStatusInput = { sessionId: string }

export type GetStatusData = {
  sessionId: string
  phase: string
  workspaceDir: string
  revision: number
  isValidated: boolean
  hasPlan: boolean
  isPlanFresh: boolean
  approval: string
  executionPhase: string
  lastRun: {
    total: number
    succeeded: number
    failed: number
    durationMs: number
  } | null
  display: string
}

export async function getStatus(
  input: GetStatusInput,
  manager: SessionManager,
): Promise<ToolResult<GetStatusData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  const phase = derivePhaseLabel(session)
  const planFresh = isPlanFresh(session)

  const lastRun = session.execution.lastSummary
    ? {
        total: session.execution.lastSummary.total,
        succeeded: session.execution.lastSummary.succeeded,
        failed: session.execution.lastSummary.failed,
        durationMs: session.execution.lastSummary.durationMs,
      }
    : null

  const lines = [
    `**Phase:** ${phase}`,
    `**Workspace:** ${session.metadata.workspaceDir}`,
    `**Manifest revision:** ${session.design.revision}`,
    session.design.validationResult
      ? `**Validation:** ${session.design.validationResult.valid ? '✅ valid' : '❌ invalid'}`
      : `**Validation:** not run`,
    session.planning.plan
      ? `**Plan:** ${session.planning.plan.nodes.filter((n) => n.action !== 'skip').length} operations` +
        ` — approval: ${session.planning.approval}` +
        (planFresh ? '' : ' ⚠ stale (manifest changed)')
      : `**Plan:** not built`,
    lastRun
      ? `**Last run:** ${lastRun.succeeded}/${lastRun.total} succeeded` +
        ` in ${(lastRun.durationMs / 1000).toFixed(1)}s`
      : `**Last run:** none`,
    `**Execution history:** ${session.execution.history.length} run(s)`,
  ]

  return ok({
    sessionId: input.sessionId,
    phase,
    workspaceDir: session.metadata.workspaceDir,
    revision: session.design.revision,
    isValidated: !!session.design.validationResult?.valid,
    hasPlan: !!session.planning.plan,
    isPlanFresh: planFresh,
    approval: session.planning.approval,
    executionPhase: session.execution.phase,
    lastRun,
    display: lines.join('\n'),
  })
}
