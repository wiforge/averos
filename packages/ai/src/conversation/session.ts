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
// Multi-turn conversation session.
//
// Enables incremental manifest evolution:
//   Turn 1: "Build a task app"    → creates full manifest
//   Turn 2: "Add priority field"  → updates manifest incrementally
//   Turn 3: "Add auth with keycloak" → updates manifest again
//
// The session carries the current manifest and conversation history
// so the LLM produces targeted diffs rather than full regenerations.
// =============================================================================

import type { Manifest }           from '@averos/dag-engine'
import type { LLMAdapter }         from '../adapters/types'
import { generateManifest }        from '../generation/manifest-generator'
import type { GenerateManifestResult } from '../generation/manifest-generator'

export type ConversationTurn = {
  role:    'user' | 'assistant'
  content: string
}

export type SessionState = {
  manifest:    Manifest | null
  history:     ConversationTurn[]
  turnCount:   number
}

export class ConversationSession {

  private state: SessionState = {
    manifest:  null,
    history:   [],
    turnCount: 0,
  }

  constructor(
    private readonly llm: LLMAdapter,
  ) {}

  get currentManifest(): Manifest | null {
    return this.state.manifest
  }

  get turnCount(): number {
    return this.state.turnCount
  }

  /**
   * Sends a user message and returns the updated manifest.
   *
   * On the first turn: generates a full manifest from scratch.
   * On subsequent turns: produces an incremental update using history.
   */
  async send(userMessage: string): Promise<GenerateManifestResult> {

    this.state.history.push({ role: 'user', content: userMessage })
    this.state.turnCount++

    // Build a context-aware prompt for incremental turns
    const intent = this.state.manifest
      ? this.buildIncrementalIntent(userMessage)
      : userMessage

    const result = await generateManifest(intent, this.llm, {
      maxRetries: 3,
      onValidationFailure: (errors, attempt) => {
        if (attempt > 1) {
          console.warn(`[Session] Turn ${this.state.turnCount}, attempt ${attempt}: ${errors.length} error(s)`)
        }
      },
    })

    this.state.manifest = result.manifest
    this.state.history.push({
      role:    'assistant',
      content: JSON.stringify(result.manifest),
    })

    return result
  }

  reset(): void {
    this.state = { manifest: null, history: [], turnCount: 0 }
  }

  private buildIncrementalIntent(userMessage: string): string {
    return [
      `Current manifest:`,
      JSON.stringify(this.state.manifest, null, 2),
      ``,
      `User wants to change:`,
      userMessage,
      ``,
      `Produce the COMPLETE updated manifest incorporating this change.`,
      `Preserve all existing entities, fields, and configuration.`,
      `Only add or modify what the user explicitly requested.`,
    ].join('\n')
  }
}