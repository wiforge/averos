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

import { parse, defaultValidator } from '@averos/dag-engine'
import { SessionNotFoundError, type SessionManager } from '../session/manager'
import { renderValidationErrorsForLLM } from '../renderers/error-renderer'
import { ok, fail, type ToolResult } from './types'

export type ValidateIrInput = { sessionId: string }

// export type ValidateIrOutput = {
//   valid:        boolean
//   sessionId:    string
//   revision:     number
//   nodeCount:    number
//   errorCount:   number
//   warningCount: number
//   display:      string
//   errors:       Array<{ severity: string; message: string; nodeId?: string }>
// }

export type ValidateIrData = {
  valid: boolean
  revision: number
  nodeCount: number
  errorCount: number
  warningCount: number
  display: string
  errors: Array<{ severity: string; message: string; nodeId?: string }>
}

export async function validateIr(
  input: ValidateIrInput,
  manager: SessionManager,
): Promise<ToolResult<ValidateIrData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!session.design.manifest) {
    return fail('NO_MANIFEST', 'No manifest found. Use update_ir to create one first.')
  }

  const nodes = parse(session.design.manifest)
  const result = defaultValidator.validate(nodes)

  await manager.patchDesign(input.sessionId, { validationResult: result })

  // Invalidate plan when validation result changes
  if (!result.valid) {
    await manager.patchPlanning(input.sessionId, {
      plan: null,
      planCreatedAt: null,
      manifestRevisionAtPlan: null,
      approval: 'not_required',
    })
  }

  const errors = result.errors.filter((e) => e.severity === 'error')
  const warnings = result.errors.filter((e) => e.severity === 'warning')

  const display = result.valid
    ? `✅ Manifest is valid — ${nodes.length} nodes parsed` +
      (warnings.length > 0 ? `, ${warnings.length} warning(s)` : '') +
      `. Run \`build_execution_plan\` next.`
    : renderValidationErrorsForLLM(result.errors)

  const data: ValidateIrData = {
    valid: result.valid,
    revision: session.design.revision,
    nodeCount: nodes.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    display,
    errors: result.errors.map((e) => ({
      severity: e.severity,
      message: e.message,
      nodeId: e.nodeId,
    })),
  }
  // Return ok even when invalid — the data.valid flag carries the verdict.
  // VALIDATION_FAILED is reserved for cases where we need to BLOCK downstream tools.
  return ok(data)
}
