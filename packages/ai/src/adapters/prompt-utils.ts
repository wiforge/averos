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
// Shared prompt utilities used across all LLM adapters.
// =============================================================================

/**
 * Splits the combined prompt produced by the manifest generator into
 * a system instruction and a user message.
 *
 * The prompt shape produced by prompts/retry.ts and prompts/system.ts:
 *
 *   <SYSTEM_PROMPT — schema rules, field definitions>
 *
 *   User request:
 *   <user intent>
 *
 * Separating these into system/user roles improves instruction-following
 * on all models, especially smaller local ones.
 */
export function splitPrompt(prompt: string): {
  systemInstruction: string
  userMessage:       string
} {
  const markers = [
    'User request:\n',
    'User wants to change:\n',
    'User request:',
    'User wants to change:',
  ]

  for (const marker of markers) {
    const idx = prompt.lastIndexOf(marker)
    if (idx !== -1) {
      return {
        systemInstruction: prompt.slice(0, idx).trim(),
        userMessage:       prompt.slice(idx).trim(),
      }
    }
  }

  return { systemInstruction: '', userMessage: prompt }
}

/**
 * Strips markdown code fences from LLM output.
 *
 * Models sometimes wrap JSON in:
 *   ```json\n...\n```
 *   ```\n...\n```
 *
 * even when instructed not to. Strip defensively.
 */
export function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()
  const match   = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/)
  return match?.[1]?.trim() ?? trimmed
}