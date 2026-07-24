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
// LLM adapter for local models via Ollama.
//
// Ollama exposes an OpenAI-compatible REST API at http://localhost:11434.
// No API key required — authentication is handled at the network level.
//
// Prerequisites:
//   1. Install Ollama: https://ollama.ai
//   2. Pull a model:   ollama pull llama3.2
//                      ollama pull qwen2.5-coder:7b   ← best for JSON/code tasks
//                      ollama pull mistral
//                      ollama pull gemma3
//   3. Start server:   ollama serve  (or it starts automatically on first use)
//
// Model recommendations for manifest generation (structured JSON):
//   qwen2.5-coder:7b   — best JSON accuracy, fast on 8GB RAM
//   qwen2.5-coder:14b  — better reasoning, needs 16GB RAM
//   llama3.2:3b        — fast, lighter, good for testing
//   llama3.1:8b        — good balance of speed and quality
//   mistral:7b         — reliable JSON output
//   deepseek-r1:8b     — strong reasoning, good for complex schemas
//
// Ollama API reference:
//   https://github.com/ollama/ollama/blob/main/docs/api.md
//   https://github.com/ollama/ollama/blob/main/docs/openai.md
// =============================================================================

import { splitPrompt, stripMarkdownFences } from './prompt-utils'
import type { LLMAdapter } from './types'

// ─── Response shapes ──────────────────────────────────────────────────────────

// Native Ollama /api/generate response (streaming=false)
type OllamaGenerateResponse = {
  model:      string
  response:   string
  done:       boolean
  done_reason?: string
  error?:     string
}

// Native Ollama /api/chat response (streaming=false)
type OllamaChatResponse = {
  model:   string
  message: {
    role:    string
    content: string
  }
  done:       boolean
  done_reason?: string
  error?:     string
}

// ─── Options ─────────────────────────────────────────────────────────────────

export type OllamaAdapterOptions = {
  /**
   * Ollama model name.
   * Default: 'qwen2.5-coder:7b'
   * Run `ollama list` to see installed models.
   */
  model?: string

  /**
   * Base URL of the Ollama server.
   * Default: 'http://localhost:11434'
   * Override when running Ollama in Docker or on a remote machine.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds.
   * Default: 120_000 (2 minutes)
   * Local models can be slow on first token — be generous.
   */
  timeoutMs?: number

  /**
   * Temperature — lower = more deterministic JSON output.
   * Default: 0.1 (very low — manifest generation needs consistency)
   */
  temperature?: number

  /**
   * Whether to use the /api/chat endpoint (true) or /api/generate (false).
   * Default: true — chat endpoint supports system prompts more reliably.
   */
  useChatEndpoint?: boolean

  /**
   * Additional Ollama model options passed in the request.
   * See: https://github.com/ollama/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values
   */
  options?: Record<string, unknown>
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class OllamaAdapter implements LLMAdapter {

  private readonly model:            string
  private readonly baseUrl:          string
  private readonly timeoutMs:        number
  private readonly temperature:      number
  private readonly useChatEndpoint:  boolean
  private readonly extraOptions:     Record<string, unknown>

  constructor(opts: OllamaAdapterOptions = {}) {
    this.model           = opts.model           ?? 'qwen2.5-coder:7b'
    this.baseUrl         = (opts.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '')
    this.timeoutMs       = opts.timeoutMs       ?? 300_000 // ← default timeout 5 minutes
    this.temperature     = opts.temperature     ?? 0.1
    this.useChatEndpoint = opts.useChatEndpoint ?? true
    this.extraOptions    = opts.options         ?? {}
  }

  async complete(prompt: string): Promise<string> {
    await this.assertServerReachable()

    return this.useChatEndpoint
      ? this.completeViaChat(prompt)
      : this.completeViaGenerate(prompt)
  }

  // ── /api/chat ─────────────────────────────────────────────────────────────
  //
  // Preferred endpoint — supports system/user message separation.
  // Local models follow system prompts more reliably via the chat interface.

  private async completeViaChat(prompt: string): Promise<string> {

    const { systemInstruction, userMessage } = splitPrompt(prompt)

    const messages: Array<{ role: string; content: string }> = []

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }

    messages.push({ role: 'user', content: userMessage })

    const body = {
      model:    this.model,
      messages,
      stream:   false,
      options: {
        temperature: this.temperature,
        num_predict: 8192,
        ...this.extraOptions,
      },
    }

    const res = await this.post('/api/chat', body)
    const data = await res.json() as OllamaChatResponse

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`)
    }

    if (!data.message?.content?.trim()) {
      throw new Error('Ollama returned an empty response')
    }

    return stripMarkdownFences(data.message.content)
  }

  // ── /api/generate ─────────────────────────────────────────────────────────
  //
  // Fallback endpoint — simpler but no explicit system prompt support.
  // The system instruction is prepended to the prompt instead.

  private async completeViaGenerate(prompt: string): Promise<string> {

    const body = {
      model:  this.model,
      prompt,
      stream: false,
      format: 'json',    // Ollama native JSON mode
      options: {
        temperature: this.temperature,
        num_predict: 8192,
        ...this.extraOptions,
      },
    }

    const res = await this.post('/api/generate', body)
    const data = await res.json() as OllamaGenerateResponse

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`)
    }

    if (!data.response?.trim()) {
      throw new Error('Ollama returned an empty response')
    }

    return stripMarkdownFences(data.response)
  }

  // ── Server health check ───────────────────────────────────────────────────
  //
  // Checks the Ollama server is reachable before making a generation request.
  // Produces a clear error message instead of a confusing ECONNREFUSED.

  private async assertServerReachable(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      })
      if (!res.ok) {
        throw new Error(`Ollama health check failed: HTTP ${res.status}`)
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(
          `Cannot reach Ollama at ${this.baseUrl}. ` +
          `Is Ollama running? Start it with: ollama serve`
        )
      }
      throw err
    }
  }

  // ── Model availability check ──────────────────────────────────────────────

  async isModelAvailable(): Promise<boolean> {
    try {
      const res  = await fetch(`${this.baseUrl}/api/tags`)
      const data = await res.json() as { models?: Array<{ name: string }> }
      return data.models?.some(m => m.name === this.model) ?? false
    } catch {
      return false
    }
  }

  /**
   * Lists all models installed in this Ollama instance.
   * Useful for debugging or building a model selector UI.
   */
  async listModels(): Promise<string[]> {
    const res  = await fetch(`${this.baseUrl}/api/tags`)
    const data = await res.json() as { models?: Array<{ name: string }> }
    return data.models?.map(m => m.name) ?? []
  }

  // ── Internal HTTP ─────────────────────────────────────────────────────────

  private async post(path: string, body: unknown): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(this.timeoutMs),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    return res
  }
}
