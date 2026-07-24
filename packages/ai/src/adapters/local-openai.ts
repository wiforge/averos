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
//
// LLM adapter for any OpenAI-compatible local server.
//
// Compatible with:
//   LM Studio      https://lmstudio.ai              localhost:1234
//   LocalAI        https://localai.io               localhost:8080
//   vLLM           https://docs.vllm.ai             localhost:8000
//   llama.cpp      https://github.com/ggerganov     localhost:8080
//   Jan            https://jan.ai                   localhost:1337
//   GPT4All        https://gpt4all.io               localhost:4891
//   Koboldcpp      https://github.com/LostRuins     localhost:5001
//
// These servers expose the OpenAI /v1/chat/completions endpoint locally.
// No API key is required (or use a dummy value like 'local').
// =============================================================================

import { splitPrompt, stripMarkdownFences } from './prompt-utils'
import type { LLMAdapter } from './types'

type OpenAICompatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
    finish_reason?: string
  }>
  error?: { message: string }
}

export type LocalOpenAIAdapterOptions = {
  /**
   * Base URL of the local server.
   * Default: 'http://localhost:1234'  (LM Studio default)
   */
  baseUrl?: string

  /**
   * Model name as the server expects it.
   * For LM Studio: the model identifier shown in the UI
   * For vLLM: the model path or HuggingFace identifier
   * For LocalAI: the model filename without extension
   * Default: 'local-model'
   */
  model?: string

  /**
   * API key. Most local servers don't require one.
   * Default: 'local'  (sent but ignored by most servers)
   */
  apiKey?: string

  /** Temperature. Default: 0.1 */
  temperature?: number

  /** Max tokens. Default: 8192 */
  maxTokens?: number

  /** Request timeout. Default: 120_000 */
  timeoutMs?: number
}

export class LocalOpenAIAdapter implements LLMAdapter {

  private readonly baseUrl:     string
  private readonly model:       string
  private readonly apiKey:      string
  private readonly temperature: number
  private readonly maxTokens:   number
  private readonly timeoutMs:   number

  constructor(opts: LocalOpenAIAdapterOptions = {}) {
    this.baseUrl     = (opts.baseUrl     ?? 'http://localhost:1234').replace(/\/$/, '')
    this.model       = opts.model        ?? 'local-model'
    this.apiKey      = opts.apiKey       ?? 'local'
    this.temperature = opts.temperature  ?? 0.1
    this.maxTokens   = opts.maxTokens    ?? 8192
    this.timeoutMs   = opts.timeoutMs    ?? 300_000 // ← default timeout 5 minutes
  }

  async complete(prompt: string): Promise<string> {

    const { systemInstruction, userMessage } = splitPrompt(prompt)

    const messages: Array<{ role: string; content: string }> = []

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }

    messages.push({ role: 'user', content: userMessage })

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model:       this.model,
        messages,
        temperature: this.temperature,
        max_tokens:  this.maxTokens,
        stream:      false,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Local LLM HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json() as OpenAICompatResponse

    if (data.error?.message) {
      throw new Error(`Local LLM error: ${data.error.message}`)
    }

    const content = data.choices?.[0]?.message?.content ?? ''

    if (!content.trim()) {
      throw new Error('Local LLM returned an empty response')
    }

    return stripMarkdownFences(content)
  }
}
