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

import { orchestrate, commandRegistry, emptyState } from '@averos/dag-engine'
import { FileStateStore } from '@averos/executor'
import { SessionNotFoundError, type SessionManager } from '../session/manager'
import { renderPlanForLLM } from '../renderers/plan-renderer'
import { isValidated } from '../session/types'
import { ok, fail, type ToolResult } from './types'
import type { ExecutionPlan } from '@averos/dag-engine'

export type BuildPlanInput = { sessionId: string }

// export type BuildPlanOutput = {
//   success:      boolean
//   sessionId:    string
//   display:      string
//   nodeCount:    number
//   actionCount:  number
//   skippedCount: number
//   warningCount: number
// }

export type BuildPlanData = {
  plan: ExecutionPlan
  display: string
  nodeCount: number
  actionCount: number
  skippedCount: number
  warningCount: number
}

export async function buildPlan(
  input: BuildPlanInput,
  manager: SessionManager,
): Promise<ToolResult<BuildPlanData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!isValidated(session)) {
    return fail(
      'NOT_VALIDATED',
      'Manifest must pass validation before building a plan. Run validate_ir first.',
    )
  }

  const stateStore = new FileStateStore(session.execution.statePath)
  const currentState = (await stateStore.load()) ?? emptyState()

  const plan = orchestrate(session.design.manifest!, currentState, commandRegistry)

  await manager.patchPlanning(input.sessionId, {
    plan,
    planCreatedAt: new Date().toISOString(),
    manifestRevisionAtPlan: session.design.revision,
    approval: 'pending',
  })

  const actionable = plan.nodes.filter((n) => n.action !== 'skip')
  const skipped = plan.nodes.filter((n) => n.action === 'skip')

  return ok({
    plan,
    display: renderPlanForLLM(plan),
    nodeCount: plan.nodes.length,
    actionCount: actionable.length,
    skippedCount: skipped.length,
    warningCount: plan.warnings.length,
  })
}
