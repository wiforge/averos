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

import type { SessionId, SessionState } from '../types'
import type { SessionStore } from './types'

export class InMemorySessionStore implements SessionStore {
  private readonly map = new Map<SessionId, SessionState>()

  async load(id: SessionId): Promise<SessionState | null> {
    const session = this.map.get(id)
    // Deep copy — callers must not mutate internal state
    return session ? JSON.parse(JSON.stringify(session)) : null
  }

  async save(session: SessionState): Promise<void> {
    this.map.set(session.metadata.id, JSON.parse(JSON.stringify(session)))
  }

  async delete(id: SessionId): Promise<void> {
    this.map.delete(id)
  }

  async list(): Promise<SessionId[]> {
    return [...this.map.keys()]
  }
}
