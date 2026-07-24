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

import * as fs from 'fs'
import * as path from 'path'
import type { AverosConfig } from './types'

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined // leave it for downstream to catch, or throw
}

export function loadConfig(workspaceRoot: string, configPath: string): AverosConfig {
  const resolved = path.isAbsolute(configPath) ? configPath : path.join(workspaceRoot, configPath)
  if (!fs.existsSync(resolved)) return {}
  try {
    const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8')) as Record<string, unknown>

    if ('development' in raw) {
      const normalized = normalizeBoolean(raw.development)
      if (normalized === undefined) {
        console.warn(
          `Warning: "development" in ${resolved} must be a boolean (got ${JSON.stringify(raw.development)}); ignoring`,
        )
        delete raw.development
      } else {
        raw.development = normalized
      }
    }

    return raw as AverosConfig
  } catch {
    console.warn(`Warning: could not parse config file at ${resolved}`)
    return {}
  }
}
