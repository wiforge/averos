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

import * as fs   from 'fs'
import * as path from 'path'
import { orchestrate, commandRegistry, emptyState, Manifest } from '@averos/dag-engine'
import { FileStateStore }   from '@averos/executor'
import type { PlanArgs }    from '../args/types'
import type { AverosConfig } from '../config/types'
import { formatPlan }       from '../output/formatter'
import { Spinner }           from '../output/spinner'
import { colors }            from '../output/colors'

export async function planCommand(
  args:   PlanArgs,
  config: AverosConfig,
): Promise<number> {

  const manifestPath = path.resolve(args.workspaceRoot, args.manifestPath)

  if (!fs.existsSync(manifestPath)) {
    console.error(`${colors.red('✗')} Manifest not found: ${manifestPath}`)
    return 1
  }

  const spinner = new Spinner()
  spinner.start('Building execution plan…')

  // try {}
  let raw: Manifest
    try {
      raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch {
      spinner.fail(`Plan failed: Failed to parse manifest JSON: ${manifestPath}`)
      return 1
    }
  
  const manifest = raw

  try {
  // Load state for accurate diff
  const statePath  = path.join(args.workspaceRoot, '.averos', 'state.json')
  const stateStore = new FileStateStore(statePath)
  const state      = (await stateStore.load()) ?? emptyState()

  const plan = orchestrate(manifest, state, commandRegistry)
  spinner.succeed(
      `Plan ready — ${colors.cyan(String(plan.nodes.filter(n => n.action !== 'skip').length))} ` +
      `operations, ${colors.dim(plan.nodes.filter(n => n.action === 'skip').length + ' skipped')}`
    )
  process.stdout.write(formatPlan(plan, args.json))
  return 0
  } catch (err) {
    spinner.fail(`Plan failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}