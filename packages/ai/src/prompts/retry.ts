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

import { SYSTEM_PROMPT } from './system'

export function buildRetryPrompt(
  userIntent:       string,
  previousResponse: string,
  errors:           string[],
): string {
  return `${SYSTEM_PROMPT}

User request:
${userIntent}

Your previous response had these validation errors:
${errors.map(e => `  - ${e}`).join('\n')}

Previous response:
${previousResponse}

Fix all errors and respond with corrected JSON only.`
}

export function buildInitialPrompt(userIntent: string): string {
  return `${SYSTEM_PROMPT}\n\nUser request:\n${userIntent}`
}