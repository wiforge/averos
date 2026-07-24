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
// Tool: approve_plan
//
// Explicit approval step — separates "show me the plan" from "run it".
// Called by the LLM after presenting the plan and receiving user confirmation.
// =============================================================================

import type { SessionManager } from '../session/manager'
import { SessionNotFoundError } from '../session/manager'
import { isPlanFresh } from '../session/types'
import { ok, fail, type ToolResult } from './types'

export type ApprovePlanInput = {
  sessionId: string
  /** 'approve' | 'reject' */
  decision: 'approve' | 'reject'
  /** Optional reason, surfaced in audit trail. */
  reason?: string
}

// export type ApprovePlanOutput = {
//   success:   boolean
//   sessionId: string
//   approval:  string
//   display:   string
// }

export type ApprovePlanData = {
  approval: string
  display: string
}

export async function approvePlan(
  input: ApprovePlanInput,
  manager: SessionManager,
): Promise<ToolResult<ApprovePlanData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!isPlanFresh(session)) {
    return fail('PLAN_NOT_FOUND', 'No fresh plan to approve. Run build_execution_plan first.')
  }

  const approval = input.decision === 'approve' ? 'approved' : 'rejected'

  await manager.patchPlanning(input.sessionId, { approval })

  const display =
    approval === 'approved'
      ? '✅ Plan approved. Run `execute_plan` to begin execution.'
      : `❌ Plan rejected${input.reason ? `: ${input.reason}` : ''}. ` +
        `Update the manifest and run \`build_execution_plan\` again.`

  return ok({ approval, display })
}
