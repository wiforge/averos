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
// Converts raw argv into a typed AverosArgs object.
// No third-party argument parsing library — keeps the package lean.
// =============================================================================

import type { AverosArgs, GlobalArgs } from './types'

export function parseArgs(argv: string[]): AverosArgs {
  const command = argv[0] ?? 'help'

  const global: GlobalArgs = {
    command: command as GlobalArgs['command'],
    // workspaceRoot stays as cwd here — config file fallback applied in routeCommand
    workspaceRoot: getFlag(argv, '--workspace') ?? process.cwd(),
    configPath: getFlag(argv, '--config') ?? 'averos.config.json',
    verbose: hasFlag(argv, '--verbose'),
  }

  switch (command) {
    case 'run':
      return {
        ...global,
        command: 'run',
        // Positional arg only when it does not start with '--'
        // Named flag --manifest=<path> always works unambiguously
        manifestPath: getPositional(argv, 1) ?? getFlag(argv, '--manifest') ?? '', // resolved in routeCommand
        mode: (getFlag(argv, '--mode') as 'strict' | 'resilient') ?? 'resilient',
        dryRun: hasFlag(argv, '--dry-run'),
        resume: hasFlag(argv, '--resume'),
        timeoutMs: getNumberFlag(argv, '--timeout'),
        maxAttempts: getNumberFlag(argv, '--max-attempts') ?? 1,
        localTgz: getFlag(argv, '--tgz'),
        development: hasFlag(argv, '--development'),
        averosVersion: getFlag(argv, '--averos-version'),
        logsDir: getFlag(argv, '--logs-dir'),
      }

    case 'plan':
      return {
        ...global,
        command: 'plan',
        manifestPath: getPositional(argv, 1) ?? getFlag(argv, '--manifest') ?? '',
        json: hasFlag(argv, '--json'),
      }

    case 'status':
      return {
        ...global,
        command: 'status',
        json: hasFlag(argv, '--json'),
      }

    case 'generate':
      return {
        ...global,
        command: 'generate',
        intent: getPositional(argv, 1) ?? '',
        manifestPath: getFlag(argv, '--output') ?? 'averos-app.json',
        executeAfter: hasFlag(argv, '--run'),
        mode: (getFlag(argv, '--mode') as 'strict' | 'resilient') ?? 'resilient',
      }

    default:
      return { ...global, command: 'help' }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns argv[pos] only when it is a positional argument (not a flag) (does not start with --) */
function getPositional(argv: string[], pos: number): string | undefined {
  const val = argv[pos]
  return val && !val.startsWith('--') ? val : undefined
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag)
}

function getFlag(argv: string[], flag: string): string | undefined {
  const entry = argv.find((a) => a.startsWith(`${flag}=`))
  return entry?.split('=').slice(1).join('=')
}

function getNumberFlag(argv: string[], flag: string): number | undefined {
  const val = getFlag(argv, flag)
  if (!val) return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}
