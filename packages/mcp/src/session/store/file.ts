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
// Filesystem-backed session store.
// One JSON file per session under sessionDir.
// Atomic writes via tmp → fsync → rename.
// =============================================================================

import * as fs from 'fs'
import * as path from 'path'
import type { SessionId, SessionState } from '../types'
import type { SessionStore } from './types'

export class FileSessionStore implements SessionStore {
  constructor(private readonly sessionDir: string) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }

  async load(id: SessionId): Promise<SessionState | null> {
    const filePath = this.filePath(id)
    if (!fs.existsSync(filePath)) return null
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SessionState
    } catch {
      return null
    }
  }

  async save(session: SessionState): Promise<void> {
    const filePath = this.filePath(session.metadata.id)
    const tmpPath = `${filePath}.tmp`
    const content = JSON.stringify(session, null, 2)

    try {
      fs.writeFileSync(tmpPath, content, 'utf-8')
      const fd = fs.openSync(tmpPath, 'r')
      try {
        fs.fsyncSync(fd)
      } finally {
        fs.closeSync(fd)
      }
      fs.renameSync(tmpPath, filePath)
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
      } catch {
        /* ignore */
      }
      throw err
    }
  }

  async delete(id: SessionId): Promise<void> {
    const filePath = this.filePath(id)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  async list(): Promise<SessionId[]> {
    return fs
      .readdirSync(this.sessionDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
  }

  private filePath(id: SessionId): string {
    return path.join(this.sessionDir, `${id}.json`)
  }
}
