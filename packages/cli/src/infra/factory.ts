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
// Builds OrchestrationConfig from CLI args and workspace config.
// This is the only file that imports from @averos/executor directly.
// Commands import from here — never from executor directly.
// =============================================================================

import * as path from 'path'
import { ArgValue, commandRegistry } from '@averos/dag-engine'

import {
  AngularSchematicsAdapter,
  FileCheckpointStore,
  FileStateStore,
  type OrchestrationConfig,
} from '@averos/executor'
import type { AverosConfig } from '../config/types'
import { ProgressListener } from '../output/progress'

export type InfraOptions = {
  workspaceRoot: string
  mode: 'strict' | 'resilient'
  dryRun: boolean
  verbose: boolean
  timeoutMs?: number
  maxAttempts?: number
  /** Local dev flags injected into create-application only */
  localTgz?: string
  development?: boolean
  averosVersion?: string
  /** Log directory — passed through for external use */
  logsDir?: string
}

export function buildOrchestrationConfig(
  opts: InfraOptions,
  config: AverosConfig,
): OrchestrationConfig {
  const averosDir = path.join(opts.workspaceRoot, '.averos')
  const statePath = config.statePath ?? path.join(averosDir, 'state.json')
  const checkpointPath = config.checkpointPath ?? path.join(averosDir, 'checkpoints.json')

  // Inject --development and --averos-version into create-application
  // only when development mode active.
  const nodeArgOverrides: Record<string, Record<string, ArgValue>> | undefined =
    opts.development && opts.averosVersion
      ? {
          'create-application': {
            development: true,
            'averos-version': opts.averosVersion,
          },
        }
      : undefined
  return {
    registry: commandRegistry,
    adapter: new AngularSchematicsAdapter(),
    checkpointStore: new FileCheckpointStore(checkpointPath),
    stateStore: new FileStateStore(statePath),
    workspaceRoot: opts.workspaceRoot,
    mode: opts.mode,
    dryRun: opts.dryRun,
    timeoutMs: opts.timeoutMs ?? config.timeoutMs,
    maxAttempts: opts.maxAttempts ?? config.maxAttempts ?? 1,
    nodeArgOverrides,
    listeners: [new ProgressListener({ verbose: opts.verbose })],
  }
}

/**
 * Resolves the logs directory for a run.
 * Priority: explicit --logs-dir > workspaceRoot/logs
 */
export function resolveLogsDir(workspaceRoot: string, logsDir?: string): string {
  return logsDir ?? path.join(workspaceRoot, 'logs')
}
