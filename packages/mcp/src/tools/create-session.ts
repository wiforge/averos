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

import type { SessionManager }  from '../session/manager'
import type { SessionConfig }   from '../session/types'
import { ok, type ToolResult }  from './types'

export type CreateSessionInput = {
  workspaceDir: string
  config?:      Partial<SessionConfig>
}

export type CreateSessionData = {
  sessionId:    string
  workspaceDir: string
  config:       SessionConfig
  display:      string
}

export async function createSession(
  input:   CreateSessionInput,
  manager: SessionManager,
): Promise<ToolResult<CreateSessionData>> {

  // create() never throws under normal conditions — errors are infra-level
  const session = await manager.create(input.workspaceDir, input.config)

  return ok({
    sessionId:    session.metadata.id,
    workspaceDir: session.metadata.workspaceDir,
    config:       session.metadata.config,
    display:
      `✅ Session created.\n` +
      `**Session ID:** \`${session.metadata.id}\`\n` +
      `**Workspace:** ${session.metadata.workspaceDir}\n` +
      `**Mode:** ${session.metadata.config.mode}\n` +
      `Next: use \`update_ir\` to set the manifest.`,
  })
}