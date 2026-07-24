#!/usr/bin/env node

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

import { parseArgs } from '../args/parser'
import { routeCommand } from '../index'

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const code = await routeCommand(args)
  process.exit(code)
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
