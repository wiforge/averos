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
// Live progress listener that writes to stdout during execution.
// Implements RunnerEventListener so it receives typed events.
// =============================================================================

import type { RunnerEventListener } from '@averos/executor'
import type { RunnerEvent } from '@averos/executor'
import { LiveLogger } from './live-logger'

export type ProgressOptions = {
  verbose: boolean
}

export class ProgressListener implements RunnerEventListener {
  readonly logger: LiveLogger

  constructor(opts: ProgressOptions) {
    this.logger = new LiveLogger({ verbose: opts.verbose })
  }

  onEvent(event: RunnerEvent): void {
    this.logger.onEvent(event)
  }
}
