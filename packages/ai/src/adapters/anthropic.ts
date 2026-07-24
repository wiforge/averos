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

export class AnthropicAdapter implements LLMAdapter {

  constructor(
    private readonly apiKey: string = process.env['ANTHROPIC_API_KEY'] ?? '',
    private readonly model  = 'claude-sonnet-4-20250514',
  ) {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  }

  async complete(prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      this.model,
        max_tokens: 4096,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>
    }
    return data.content.filter(b => b.type === 'text').map(b => b.text).join('')
  }
}