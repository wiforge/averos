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
// Derives runtime stores from serialized session paths.
// Called at execution time — never stored in SessionState.
// =============================================================================

import { FileStateStore, FileCheckpointStore } from '@averos/executor'
import type { SessionState }                   from '../session/types'

export type RuntimeStores = {
  stateStore:      FileStateStore
  checkpointStore: FileCheckpointStore
}

export function createStoresFromSession(session: SessionState): RuntimeStores {
  return {
    stateStore:      new FileStateStore(session.execution.statePath),
    checkpointStore: new FileCheckpointStore(session.execution.checkpointPath),
  }
}