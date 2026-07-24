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
import { ok, fail, type ToolResult } from './types'

export type RollbackRevisionInput = {
  sessionId: string
  /** Revision number to restore. Use list_revisions to see available revisions. */
  revision: number
}

export type RollbackRevisionData = {
  restoredRevision: number
  newRevision: number
  display: string
}

export async function rollbackRevision(
  input: RollbackRevisionInput,
  manager: SessionManager,
): Promise<ToolResult<RollbackRevisionData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  const target = session.design.history.find((r) => r.revision === input.revision)

  if (!target) {
    const available = session.design.history.map((r) => r.revision).join(', ')
    return fail(
      'REVISION_NOT_FOUND',
      `Revision ${input.revision} not found. ` +
        `Available revisions: ${available || 'none (no history yet)'}`,
    )
  }

  const updated = await manager.setManifest(
    input.sessionId,
    target.manifest,
    `Rollback to revision ${input.revision}`,
  )

  return ok({
    restoredRevision: input.revision,
    newRevision: updated.design.revision,
    display:
      `✅ Rolled back to revision ${input.revision}. ` +
      `Current revision is now ${updated.design.revision}. ` +
      `Run \`validate_ir\` to re-validate.`,
  })
}
