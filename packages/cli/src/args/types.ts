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

export type GlobalArgs = {
  command: 'run' | 'plan' | 'status' | 'generate' | 'help'
  workspaceRoot: string
  configPath: string
  verbose: boolean
}

export type RunArgs = GlobalArgs & {
  command: 'run'
  manifestPath: string
  mode: 'strict' | 'resilient'
  dryRun: boolean
  resume: boolean
  timeoutMs: number | undefined
  maxAttempts: number
  /** Path to local .tgz. Undefined = install from npm registry */
  localTgz?: string

  development?: boolean
  /** Averos version string — required when localTgz is set */
  averosVersion?: string
  /** Directory for execution logs. Default: <workspaceRoot>/logs */
  logsDir?: string
}

export type PlanArgs = GlobalArgs & {
  command: 'plan'
  manifestPath: string
  json: boolean // output as JSON instead of table
}

export type StatusArgs = GlobalArgs & {
  command: 'status'
  json: boolean
}

export type GenerateArgs = GlobalArgs & {
  command: 'generate'
  intent: string
  manifestPath: string // where to write the generated manifest
  executeAfter: boolean // run immediately after generation
  mode: 'strict' | 'resilient'
}

export type AverosArgs =
  RunArgs | PlanArgs | StatusArgs | GenerateArgs | (GlobalArgs & { command: 'help' })
