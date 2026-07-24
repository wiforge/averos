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
// SessionManager — the only way to read and write session state.
//
// Responsibilities:
//   - Create sessions
//   - Load sessions (throws on missing)
//   - Apply typed domain patches
//   - Enforce invariants (e.g. revision increment on manifest change)
//
// The manager is store-agnostic — inject any SessionStore implementation.
// =============================================================================

import type { SessionStore } from './store/types'
import {
  createSessionState,
  MAX_HISTORY_SIZE,
  type SessionId,
  type SessionState,
  type SessionConfig,
  type DesignState,
  type PlanningState,
  type ExecutionState,
  type ManifestRevision,
} from './types'
import type { Manifest } from '@averos/dag-engine'

export class SessionManager {
  constructor(private readonly store: SessionStore) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(workspaceDir: string, config?: Partial<SessionConfig>): Promise<SessionState> {
    const session = createSessionState(workspaceDir, config)
    await this.store.save(session)
    return session
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async load(id: SessionId): Promise<SessionState> {
    const session = await this.store.load(id)
    if (!session) throw new SessionNotFoundError(id)
    return session
  }

  async tryLoad(id: SessionId): Promise<SessionState | null> {
    return this.store.load(id)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(id: SessionId): Promise<void> {
    return this.store.delete(id)
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async list(): Promise<SessionId[]> {
    return this.store.list()
  }

  // ── Domain patches ────────────────────────────────────────────────────────
  // Each method loads, applies a typed patch, stamps updatedAt, and saves.
  // No method accepts raw Partial<SessionState> — always typed patches.

  async patchMetadata(
    id: SessionId,
    patch: Partial<Omit<SessionState['metadata'], 'id' | 'createdAt'>>,
  ): Promise<SessionState> {
    return this.patch(id, (session) => ({
      ...session,
      metadata: { ...session.metadata, ...patch },
    }))
  }

  /**
   * Updates the manifest and increments revision.
   * Automatically records a snapshot in history.
   * Invalidates validation and plan on manifest change.
   */
  async setManifest(id: SessionId, manifest: Manifest, comment?: string): Promise<SessionState> {
    return this.patch(id, (session) => {
      const nextRevision = session.design.revision + 1

      const revision: ManifestRevision = {
        revision: nextRevision,
        timestamp: new Date().toISOString(),
        manifest: session.design.manifest!,
        comment,
      }

      // Keep only last N revisions
      const history =
        session.design.manifest !== null
          ? [...session.design.history, revision].slice(-MAX_HISTORY_SIZE)
          : session.design.history

      return {
        ...session,
        design: {
          ...session.design,
          manifest,
          revision: nextRevision,
          history,
          // Invalidate validation — manifest changed
          validationResult: null,
        },
        // Invalidate plan — manifest changed
        planning: {
          ...session.planning,
          plan: null,
          planCreatedAt: null,
          manifestRevisionAtPlan: null,
          approval: 'not_required',
        },
      }
    })
  }

  async patchDesign(id: SessionId, patch: Partial<DesignState>): Promise<SessionState> {
    return this.patch(id, (session) => ({
      ...session,
      design: { ...session.design, ...patch },
    }))
  }

  async patchPlanning(id: SessionId, patch: Partial<PlanningState>): Promise<SessionState> {
    return this.patch(id, (session) => ({
      ...session,
      planning: { ...session.planning, ...patch },
    }))
  }

  async patchExecution(id: SessionId, patch: Partial<ExecutionState>): Promise<SessionState> {
    return this.patch(id, (session) => ({
      ...session,
      execution: { ...session.execution, ...patch },
    }))
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async patch(
    id: SessionId,
    fn: (current: SessionState) => SessionState,
  ): Promise<SessionState> {
    const current = await this.load(id)
    const updated = fn(current)
    const stamped: SessionState = {
      ...updated,
      metadata: {
        ...updated.metadata,
        updatedAt: new Date().toISOString(),
      },
    }
    await this.store.save(stamped)
    return stamped
  }
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SessionNotFoundError extends Error {
  constructor(id: SessionId) {
    super(`Session not found: ${id}`)
    this.name = 'SessionNotFoundError'
  }
}
