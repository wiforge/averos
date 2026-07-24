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

import type { LLMAdapter } from './types'

export class OpenAIAdapter implements LLMAdapter {

  constructor(
    private readonly apiKey: string = process.env['OPENAI_API_KEY'] ?? '',
    private readonly model  = 'gpt-4o',
  ) {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY is not set')
  }

  async complete(prompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model:    this.model,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
    }
    return stripMarkdownFences(data.choices[0]?.message.content ?? '')
  }
}

/**
 * Removes ```json ... ``` or ``` ... ``` markdown fences.
 * Gemini occasionally adds these even when instructed not to.
 */
function stripMarkdownFences(text: string): string {
  const trimmed = text.trim()

  // Match ```json\n...\n``` or ```\n...\n```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/)
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim()
  }

  return trimmed
}