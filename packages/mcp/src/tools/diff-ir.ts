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
// Tool: diff_ir
//
// Computes the semantic diff between two manifest states using the DAG
// engine's authoritative diff function.
//
// Why use @averos/dag-engine diff() rather than JSON comparison:
//   - diff() operates on normalized DomainNode[] — hash-based comparison
//   - Two manifests with different JSON structure but identical semantics
//     correctly produce zero changes
//   - ChangeSet encodes updatable/conflict semantics the LLM needs
//   - Single source of truth — same diff used by the planner
//
// Modes:
//   current_vs_executed   — current manifest vs last executed state
//   revision_vs_revision  — two specific historical revisions
//   current_vs_revision   — current manifest vs a historical revision
// =============================================================================

import { diff, parse, toMap } from '@averos/dag-engine'
import type { Manifest, ChangeSet } from '@averos/dag-engine'

import type { SessionManager } from '../session/manager'
import { SessionNotFoundError } from '../session/manager'
import { ok, fail, type ToolResult } from './types'
import { renderDiffForLLM } from '../renderers/diff-renderer'

// =============================================================================
// Types
// =============================================================================

export type DiffIrInput = {
  sessionId: string
  /**
   * Compare mode:
   *   current_vs_executed   — current manifest vs last successfully executed state
   *   revision_vs_revision  — two specific revisions from history
   *   current_vs_revision   — current manifest vs a specific historical revision
   */
  mode: 'current_vs_executed' | 'revision_vs_revision' | 'current_vs_revision'
  /** Required when mode = 'revision_vs_revision' (the older/base revision). */
  fromRevision?: number
  /** Required when mode = 'revision_vs_revision' or 'current_vs_revision'. */
  toRevision?: number
}

export type DiffIrData = {
  mode: string
  baseLabel: string
  targetLabel: string
  toAdd: number
  toUpdate: number
  unchanged: number
  conflicts: number
  toRemove: number
  isIdentical: boolean
  hasConflicts: boolean
  display: string
}

// =============================================================================
// Tool implementation
// =============================================================================

export async function diffIr(
  input: DiffIrInput,
  manager: SessionManager,
): Promise<ToolResult<DiffIrData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── Resolve base and target manifests ─────────────────────────────────────

  let baseManifest: Manifest | null = null
  let targetManifest: Manifest | null = null
  let baseLabel = 'base'
  let targetLabel = 'target'

  switch (input.mode) {
    case 'current_vs_executed': {
      if (!session.design.manifest) {
        return fail('NO_MANIFEST', 'No current manifest. Use update_ir first.')
      }
      if (session.execution.history.length === 0) {
        return fail('PLAN_NOT_FOUND', 'No execution has been run yet. Nothing to diff against.')
      }

      // The manifest active at last execution is identified by the revision
      // recorded in planning.manifestRevisionAtPlan at execution time.
      // We stored the last execution record — derive from history.
      // const lastRecord      = session.execution.history[session.execution.history.length - 1]
      const executedRevision = session.planning.manifestRevisionAtPlan

      // Find the manifest snapshot for the executed revision
      const historicalEntry =
        executedRevision !== null
          ? session.design.history.find((h) => h.revision === executedRevision)
          : null

      if (!historicalEntry) {
        // Executed revision is the current one — nothing changed
        baseManifest = session.design.manifest
        baseLabel = `last executed (rev ${executedRevision ?? '?'})`
      } else {
        baseManifest = historicalEntry.manifest
        baseLabel = `last executed (rev ${executedRevision})`
      }

      targetManifest = session.design.manifest
      targetLabel = `current (rev ${session.design.revision})`
      break
    }

    case 'revision_vs_revision': {
      if (input.fromRevision === undefined || input.toRevision === undefined) {
        return fail(
          'INTERNAL_ERROR',
          'revision_vs_revision mode requires both fromRevision and toRevision.',
        )
      }

      const from = session.design.history.find((h) => h.revision === input.fromRevision)
      const to = session.design.history.find((h) => h.revision === input.toRevision)

      if (!from) {
        return fail(
          'REVISION_NOT_FOUND',
          `Revision ${input.fromRevision} not found in history. ` +
            `Available: ${availableRevisions(session.design.history)}`,
        )
      }
      if (!to) {
        return fail(
          'REVISION_NOT_FOUND',
          `Revision ${input.toRevision} not found in history. ` +
            `Available: ${availableRevisions(session.design.history)}`,
        )
      }

      baseManifest = from.manifest
      targetManifest = to.manifest
      baseLabel = `revision ${input.fromRevision}`
      targetLabel = `revision ${input.toRevision}`
      break
    }

    case 'current_vs_revision': {
      if (input.toRevision === undefined) {
        return fail('INTERNAL_ERROR', 'current_vs_revision mode requires toRevision.')
      }
      if (!session.design.manifest) {
        return fail('NO_MANIFEST', 'No current manifest. Use update_ir first.')
      }

      const historical = session.design.history.find((h) => h.revision === input.toRevision)
      if (!historical) {
        return fail(
          'REVISION_NOT_FOUND',
          `Revision ${input.toRevision} not found in history. ` +
            `Available: ${availableRevisions(session.design.history)}`,
        )
      }

      baseManifest = historical.manifest
      targetManifest = session.design.manifest
      baseLabel = `revision ${input.toRevision}`
      targetLabel = `current (rev ${session.design.revision})`
      break
    }

    default:
      return fail('INTERNAL_ERROR', `Unknown diff mode: ${(input as any).mode}`)
  }

  // ── Compute semantic diff via DAG engine ─────────────────────────────────
  // Parse both manifests into DomainNode[] then compute hashed diff.
  // This is the same diff the planner uses — single source of truth.

  const changeSet = computeChangeSet(baseManifest, targetManifest)

  const isIdentical =
    changeSet.toAdd.size === 0 &&
    changeSet.toUpdate.size === 0 &&
    changeSet.conflicts.size === 0 &&
    changeSet.toRemove.size === 0
  const hasConflicts = changeSet.conflicts.size > 0

  const display = renderDiffForLLM(changeSet, baseLabel, targetLabel)

  return ok({
    mode: input.mode,
    baseLabel,
    targetLabel,
    toAdd: changeSet.toAdd.size,
    toUpdate: changeSet.toUpdate.size,
    unchanged: changeSet.unchanged.size,
    conflicts: changeSet.conflicts.size,
    toRemove: changeSet.toRemove.size,
    isIdentical,
    hasConflicts,
    display,
  })
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parses both manifests and computes the authoritative DAG engine diff.
 * Uses the same hash-based comparison as the planner.
 */
function computeChangeSet(baseManifest: Manifest, targetManifest: Manifest): ChangeSet {
  const baseNodes = parse(baseManifest)
  const targetNodes = parse(targetManifest)

  return diff(
    toMap(targetNodes), // manifestMap  — what we want (target)
    toMap(baseNodes), // stateMap     — what exists  (base)
  )
}

function availableRevisions(history: Array<{ revision: number }>): string {
  const nums = history.map((h) => h.revision)
  return nums.length > 0 ? nums.join(', ') : 'none'
}
