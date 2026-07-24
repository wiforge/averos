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

import type { ValidationError } from '@averos/dag-engine'

export function renderValidationErrorsForLLM(errors: ValidationError[]): string {
  const byLevel = {
    error: errors.filter((e) => e.severity === 'error'),
    warning: errors.filter((e) => e.severity === 'warning'),
  }

  const lines: string[] = [
    `## Validation Failed`,
    ``,
    `The manifest has **${byLevel.error.length} error(s)** that must be fixed:`,
    ``,
  ]

  for (const err of byLevel.error) {
    const location = err.nodeId ? ` *(node: ${err.nodeId})*` : ''
    lines.push(`- ❌ ${err.message}${location}`)
  }

  if (byLevel.warning.length > 0) {
    lines.push(``)
    lines.push(`**${byLevel.warning.length} warning(s):**`)
    for (const w of byLevel.warning) {
      lines.push(`- ⚠ ${w.message}`)
    }
  }

  lines.push(``)
  lines.push(`Please fix the errors above and try again.`)

  return lines.join('\n')
}
