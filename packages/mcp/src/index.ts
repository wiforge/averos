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

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createAverosServer } from './server'
import * as path from 'path'
import * as os from 'os'

const sessionDir =
  process.env['AVEROS_SESSION_DIR'] ?? path.join(os.homedir(), '.averos', 'sessions')

const server = createAverosServer({ sessionDir })
const transport = new StdioServerTransport()

server
  .connect(transport)
  .then(() => {
    process.stdout.write('[averos-mcp] Server ready on stdio\n')
  })
  .catch((err) => {
    process.stderr.write(`[averos-mcp] Fatal: ${err.message}\n`)
    process.exit(1)
  })
