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
import type { ManifestRevision } from '../session/types'
import { ok, fail, type ToolResult } from './types'

export type ListRevisionsInput = { sessionId: string }

export type ListRevisionsData = {
  currentRevision: number
  count: number
  revisions: Array<{
    revision: number
    timestamp: string
    comment?: string
  }>
  display: string
}

export async function listRevisions(
  input: ListRevisionsInput,
  manager: SessionManager,
): Promise<ToolResult<ListRevisionsData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  const { history, revision } = session.design

  const revisions = history.map((r: ManifestRevision) => ({
    revision: r.revision,
    timestamp: r.timestamp,
    comment: r.comment,
  }))

  const lines =
    revisions.length > 0
      ? [
          `**Manifest revisions** (current: ${revision}):`,
          '',
          ...revisions.map(
            (r) =>
              `- **Rev ${r.revision}** — ${formatTimestamp(r.timestamp)}` +
              (r.comment ? ` — *${r.comment}*` : ''),
          ),
          '',
          `Use \`rollback_revision\` with a revision number to restore.`,
        ]
      : [
          `No revision history yet (current revision: ${revision}).`,
          `Revision history is recorded after the second \`update_ir\` call.`,
        ]

  return ok({
    currentRevision: revision,
    count: revisions.length,
    revisions,
    display: lines.join('\n'),
  })
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
