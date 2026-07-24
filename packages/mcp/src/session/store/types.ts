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
// SessionStore interface — storage backend abstraction.
// Implementations: InMemorySessionStore, FileSessionStore, RedisSessionStore.
// =============================================================================

import type { SessionId, SessionState } from '../types'

export interface SessionStore {
  /** Returns null when session does not exist. */
  load(id: SessionId): Promise<SessionState | null>

  /** Creates or overwrites the session. */
  save(session: SessionState): Promise<void>

  /** Deletes the session. No-op if not found. */
  delete(id: SessionId): Promise<void>

  /** Lists all session IDs. */
  list(): Promise<SessionId[]>
}
