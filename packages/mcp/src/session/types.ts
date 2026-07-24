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
// All session state types.
//
// Architecture:
//   SessionState = metadata + design + planning + execution
//
// Each domain is independently mutable and serializable.
// No runtime objects (stores, adapters) live here.
// =============================================================================

import type { Manifest, ExecutionPlan, ValidationResult } from '@averos/dag-engine'
import type { RunnerSummary } from '@averos/executor'

// ─── Primitives ───────────────────────────────────────────────────────────────

export type SessionId = string // plain string — no branding, no friction

// ─── Session Config ───────────────────────────────────────────────────────────

/**
 * Per-session execution policy.
 * Stored in metadata so it survives serialization.
 * Overrides global MCP defaults at execution time.
 */
export type SessionConfig = {
  mode: 'strict' | 'resilient'
  timeoutMs: number
  maxAttempts: number
  dryRun: boolean
}

export const defaultSessionConfig = (): SessionConfig => ({
  mode: 'resilient',
  timeoutMs: 600_000,
  maxAttempts: 1,
  dryRun: false,
})

// ─── Session Metadata ────────────────────────────────────────────────────────

export type SessionMetadata = {
  id: SessionId
  createdAt: string
  updatedAt: string

  /** Absolute path to the Angular workspace directory. */
  workspaceDir: string

  /** Per-session execution policy. */
  config: SessionConfig
}

// ─── Design State ─────────────────────────────────────────────────────────────

/**
 * Single immutable snapshot of a manifest at a point in time.
 * Stored in history for undo/audit/diff.
 */
export type ManifestRevision = {
  revision: number
  timestamp: string
  manifest: Manifest
  /** Optional human-readable description of what changed. */
  comment?: string
}

/**
 * Domain: LLM intent → manifest → validation.
 *
 * Only stores the source manifest and last validation result.
 * validatedManifest and normalizedManifest are derived on demand —
 * never cached here to prevent staleness.
 *
 * revision:   Monotonically increasing counter. Incremented on every update_ir.
 *             Used by PlanningState to detect manifest drift.
 * history:    Last N revisions for undo/audit. Capped at MAX_HISTORY_SIZE.
 */
export type DesignState = {
  manifest: Manifest | null
  validationResult: ValidationResult | null // null = not yet validated
  revision: number
  history: ManifestRevision[]
}

export const MAX_HISTORY_SIZE = 50
export const MAX_EXECUTION_HISTORY = 50

// ─── Planning State ───────────────────────────────────────────────────────────

/**
 * Approval is a first-class concept.
 * A boolean collapses 'pending' and 'rejected' into the same state.
 */
export type ApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected'

/**
 * Domain: validated manifest → execution plan → user approval.
 *
 * manifestRevisionAtPlan:
 *   Records design.revision at the time the plan was built.
 *   execute_plan rejects if design.revision !== manifestRevisionAtPlan.
 *   This is deterministic invalidation — no time-based TTL.
 */
export type PlanningState = {
  plan: ExecutionPlan | null
  planCreatedAt: string | null
  manifestRevisionAtPlan: number | null // deterministic staleness check
  approval: ApprovalState
}

// ─── Execution State ──────────────────────────────────────────────────────────

export type ExecutionPhase = 'not_started' | 'running' | 'completed' | 'failed'

/**
 * One complete execution run.
 * Stored in history so users can ask "what happened last time?"
 */
export type ExecutionRecord = {
  executionId: string
  startedAt: string
  completedAt?: string
  summary: RunnerSummary
}

/**
 * Domain: execution engine state.
 *
 * checkpointPath / statePath:
 *   Serializable strings — not store instances.
 *   execute_plan reconstructs stores from these paths at call time.
 *   This keeps SessionState fully serializable across Redis/Postgres/disk.
 *
 * executionId:
 *   Future-proof for async execution, streaming logs, cancellation.
 */
export type ExecutionState = {
  phase: ExecutionPhase
  executionId?: string
  startedAt?: string
  completedAt?: string
  lastSummary: RunnerSummary | null
  lastError?: string
  checkpointPath: string
  statePath: string
  history: ExecutionRecord[]
}

// ─── Root SessionState ────────────────────────────────────────────────────────

export type SessionState = {
  metadata: SessionMetadata
  design: DesignState
  planning: PlanningState
  execution: ExecutionState
}

// ─── Factory ─────────────────────────────────────────────────────────────────

import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Creates a new SessionState with correct defaults.
 * All paths are derived from workspaceDir — never stored externally.
 */
export function createSessionState(
  workspaceDir: string,
  config?: Partial<SessionConfig>,
): SessionState {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const aveDir = path.join(workspaceDir, '.averos')

  return {
    metadata: {
      id,
      createdAt: now,
      updatedAt: now,
      workspaceDir,
      config: { ...defaultSessionConfig(), ...config },
    },
    design: {
      manifest: null,
      validationResult: null,
      revision: 0,
      history: [],
    },
    planning: {
      plan: null,
      planCreatedAt: null,
      manifestRevisionAtPlan: null,
      approval: 'not_required',
    },
    execution: {
      phase: 'not_started',
      lastSummary: null,
      checkpointPath: path.join(aveDir, 'checkpoints.json'),
      statePath: path.join(aveDir, 'state.json'),
      history: [],
    },
  }
}

// ─── Derived state helpers ────────────────────────────────────────────────────

/** True when the manifest exists and has passed validation. */
export function isValidated(session: SessionState): boolean {
  return (
    session.design.manifest !== null &&
    session.design.validationResult !== null &&
    session.design.validationResult.valid
  )
}

/** True when a plan exists and the manifest hasn't changed since planning. */
export function isPlanFresh(session: SessionState): boolean {
  return (
    session.planning.plan !== null &&
    session.planning.manifestRevisionAtPlan === session.design.revision
  )
}

/** True when the plan is approved and ready to execute. */
export function isApproved(session: SessionState): boolean {
  return isPlanFresh(session) && session.planning.approval === 'approved'
}

/** Derives the current pipeline phase as a human-readable label. */
export function derivePhaseLabel(session: SessionState): string {
  const { design, execution } = session

  if (execution.phase === 'running') return '🔄 Executing — in progress' // return 'executing'
  if (execution.phase === 'completed') return '✅ Complete' // return 'complete'
  if (execution.phase === 'failed') return '❌ Failed' // return 'failed'
  if (isApproved(session)) return '✔️ Approved' // return 'approved'
  if (isPlanFresh(session)) return '🟡 Planned — awaiting approval' // return 'planned'
  if (isValidated(session)) return '🟢 Validated — ready to plan' // return 'validated'
  if (design.manifest !== null) return '🔵 Draft — manifest needs validation' // return 'draft'
  return '⚪ Idle — no manifest yet' //return 'idle'
}
