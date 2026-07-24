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
// LLM adapter for Google Gemini (via Google AI Studio REST API).
//
// Authentication:
//   Set GEMINI_API_KEY environment variable.
//   Free tier available at https://aistudio.google.com/app/apikey
//
// Model selection:
//   Default: gemini-2.0-flash  (fast, free tier, good for structured JSON)
//   Also available:
//     gemini-2.5-flash         (better reasoning, still free tier)
//     gemini-2.5-pro           (best quality, paid)
//
// API reference:
//   https://ai.google.dev/api/generate-content
//
// Response format:
//   The Gemini API returns candidates[].content.parts[].text
//   We join all text parts from the first candidate.
//
// Important: we request JSON output mode via responseMimeType so the model
// is constrained to produce valid JSON — reduces retry loops significantly.
// =============================================================================

import type { LLMAdapter } from './types'

// ─── Gemini REST response shape ───────────────────────────────────────────────

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
  error?: {
    code:    number
    message: string
    status:  string
  }
}

type GeminiRequest = {
  contents: Array<{
    role:  'user' | 'model'
    parts: Array<{ text: string }>
  }>
  generationConfig?: {
    temperature?:      number
    maxOutputTokens?:  number
    responseMimeType?: string
  }
  systemInstruction?: {
    parts: Array<{ text: string }>
  }
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export type GeminiAdapterOptions = {
  apiKey?:         string
  model?:          string
  maxOutputTokens?: number
  /**
   * Temperature — lower = more deterministic JSON output.
   * Default: 0.2 (intentionally low for structured manifest generation)
   */
  temperature?:    number
  /**
   * When true, requests JSON output via responseMimeType.
   * Default: true — the manifest generator always needs JSON.
   */
  jsonMode?:       boolean
}

export class GeminiAdapter implements LLMAdapter {

  private readonly apiKey:          string
  private readonly model:           string
  private readonly maxOutputTokens: number
  private readonly temperature:     number
  private readonly jsonMode:        boolean

  constructor(opts: GeminiAdapterOptions = {}) {
    this.apiKey = opts.apiKey
      ?? process.env['GEMINI_API_KEY']
      ?? process.env['GOOGLE_API_KEY']
      ?? ''

    if (!this.apiKey) {
      throw new Error(
        'Gemini API key is not set. ' +
        'Export GEMINI_API_KEY or pass apiKey in GeminiAdapterOptions. ' +
        'Get a free key at https://aistudio.google.com/app/apikey'
      )
    }

    this.model           = opts.model           ?? 'gemini-2.0-flash'
    this.maxOutputTokens = opts.maxOutputTokens ?? 8192
    this.temperature     = opts.temperature     ?? 0.2
    this.jsonMode        = opts.jsonMode        ?? true
  }

  async complete(prompt: string): Promise<string> {

    // ── Split system instruction from user prompt ──────────────────────────
    // The manifest generator builds a combined prompt (system + user intent).
    // Gemini performs better when the system instruction is separated into
    // the systemInstruction field rather than embedded in the user message.
    const { systemInstruction, userMessage } = splitPrompt(prompt)

    const body: GeminiRequest = {
      contents: [
        {
          role:  'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature:     this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        // Constrain output to JSON — avoids markdown fences and prose
        ...(this.jsonMode
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    }

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      }
    }

    const url = this.buildUrl()

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    // ── Error handling ────────────────────────────────────────────────────

    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const errBody = await res.json() as GeminiResponse
        if (errBody.error?.message) {
          detail = `${errBody.error.status}: ${errBody.error.message}`
        }
      } catch { /* ignore parse error, use HTTP status */ }
      throw new Error(`Gemini API error: ${detail}`)
    }

    const data = await res.json() as GeminiResponse

    // ── Extract text ──────────────────────────────────────────────────────

    const candidate = data.candidates?.[0]

    if (!candidate) {
      throw new Error('Gemini returned no candidates')
    }

    // Surface safety/quota stop reasons clearly
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(
        `Gemini stopped with reason: ${candidate.finishReason}. ` +
        'This may indicate a safety filter or token limit was hit.'
      )
    }

    const text = candidate.content?.parts
      ?.filter(p => typeof p.text === 'string')
      .map(p => p.text as string)
      .join('') ?? ''

    if (!text.trim()) {
      throw new Error('Gemini returned an empty response')
    }

    // ── Strip markdown fences if jsonMode is off ──────────────────────────
    // When responseMimeType is not set, Gemini sometimes wraps JSON in
    // ```json ... ``` fences despite instructions. Strip them defensively.
    return stripMarkdownFences(text)
  }

  // ── Build API URL ─────────────────────────────────────────────────────────

  private buildUrl(): string {
    return (
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.model}:generateContent?key=${this.apiKey}`
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Splits the combined prompt produced by the manifest generator into:
 *   systemInstruction — the static schema/rules section (before "User request:")
 *   userMessage       — the dynamic user intent section
 *
 * The manifest generator builds prompts in this shape:
 *   <SYSTEM_PROMPT>
 *   ...rules...
 *
 *   User request:
 *   <user intent>
 *
 * Gemini benefits from having the system instruction separated.
 */
function splitPrompt(prompt: string): {
  systemInstruction: string
  userMessage:       string
} {
  // Split on the last occurrence of "User request:" or "User wants to change:"
  const markers = ['User request:\n', 'User wants to change:\n']

  for (const marker of markers) {
    const idx = prompt.lastIndexOf(marker)
    if (idx !== -1) {
      return {
        systemInstruction: prompt.slice(0, idx).trim(),
        userMessage:       prompt.slice(idx).trim(),
      }
    }
  }

  // No marker found — treat entire prompt as user message
  return { systemInstruction: '', userMessage: prompt }
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