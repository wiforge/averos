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
import type { Manifest } from '@averos/dag-engine'
import { ok, fail, type ToolResult } from './types'

export type GetIrInput = { sessionId: string }

export type GetIrData = {
  revision: number
  manifest: Manifest | null
  display: string
}

export async function getIr(
  input: GetIrInput,
  manager: SessionManager,
): Promise<ToolResult<GetIrData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  const { manifest, revision } = session.design

  const display = manifest
    ? `**Manifest (revision ${revision}):**\n\`\`\`json\n${JSON.stringify(manifest, null, 2)}\n\`\`\``
    : `No manifest set yet. Use \`update_ir\` to create one.`

  return ok({ revision, manifest, display })
}
