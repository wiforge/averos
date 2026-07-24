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


export * from './adapters/types'
export * from './adapters/anthropic'
export * from './adapters/openai'
export * from './adapters/gemini'
export * from './adapters/ollama'
export * from './adapters/local-openai'
export * from './adapters/prompt-utils'
export * from './generation/manifest-generator'
export * from './pipeline/intent-pipeline'
export * from './conversation/session'

import { AnthropicAdapter }               from './adapters/anthropic'
import { GeminiAdapter }                  from './adapters/gemini'
import { OpenAIAdapter }                  from './adapters/openai'
import { OllamaAdapter }                  from './adapters/ollama'
import { LocalOpenAIAdapter }             from './adapters/local-openai'
import type { LLMAdapter }                from './adapters/types'
import type { OllamaAdapterOptions }      from './adapters/ollama'
import type { LocalOpenAIAdapterOptions } from './adapters/local-openai'

export type LLMProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'local'

/**
 * Per-provider configuration options passed to buildLLMAdapter.
 * All fields are optional — each adapter falls back to its own defaults.
 */
export type LLMAdapterOptions = {
  /** Options forwarded to OllamaAdapter when provider = 'ollama'. */
  ollama?: OllamaAdapterOptions
  /** Options forwarded to LocalOpenAIAdapter when provider = 'local'. */
  local?:  LocalOpenAIAdapterOptions
}

/**
 * Builds the correct LLM adapter from a provider name string.
 *
 * Used by the CLI generate command so it never imports adapter classes
 * directly — keeping @averos/ai as an optional peer dependency.
 *
 * @param provider  One of: anthropic | openai | gemini | ollama | local
 * @param options   Per-provider options (baseUrl, model, etc.)
 *
 * @example
 * // Remote Ollama on local network
 * buildLLMAdapter('ollama', {
 *   ollama: {
 *     baseUrl: 'http://192.168.1.50:11434',
 *     model:   'qwen2.5-coder:7b',
 *   }
 * })
 *
 * @example
 * // LM Studio on VM host
 * buildLLMAdapter('local', {
 *   local: {
 *     baseUrl: 'http://10.0.2.2:1234',
 *     model:   'qwen2.5-coder-7b',
 *   }
 * })
 */
export function buildLLMAdapter(
  provider: LLMProvider,
  options:  LLMAdapterOptions = {},
): LLMAdapter {
  switch (provider) {
    case 'anthropic': return new AnthropicAdapter()
    case 'openai':    return new OpenAIAdapter()
    case 'gemini':    return new GeminiAdapter()
    case 'ollama':    return new OllamaAdapter(options.ollama)
    case 'local':     return new LocalOpenAIAdapter(options.local)
    default:          throw new Error(`Unknown LLM provider: "${provider}". ` +
                        `Valid: anthropic, openai, gemini, ollama, local`)
  }
}