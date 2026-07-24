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
// Tool: update_ir
//
// Applies a JSON Patch (RFC 6902) to the current session manifest.
// RFC 6902 is the correct primitive for structured document mutation.
//
// Why JSON Patch over replacement:
//   - LLM can express surgical changes ("add field X to entity Y")
//   - Full replacement is still possible (replace root)
//   - Operations are auditable
//   - 'test' op enables guarded mutations
//   - Supports undo via inverse patch
//
// The patch is applied atomically — if any operation fails, the
// manifest is not modified and an error is returned.
// =============================================================================

import type { Manifest } from '@averos/dag-engine'
import { SessionNotFoundError, type SessionManager } from '../session/manager'
import { ok, fail, type ToolResult } from './types'

// ─── Minimal RFC 6902 JSON Patch engine ──────────────────────────────────────
// We implement only the operations used in practice.
// For full RFC 6902 compliance, swap in the `fast-json-patch` package.

export type JsonPatchOperation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown }

export type UpdateIrInput = {
  sessionId: string
  /** JSON Patch operations per RFC 6902. */
  patch: JsonPatchOperation[]
  /** Optional human-readable description for revision history. */
  comment?: string
}

// export type UpdateIrOutput = {
//   success:         boolean
//   sessionId:       string
//   revision:        number
//   manifest:        Manifest | null
//   message:         string
//   patchedPaths:    string[]
// }

export type UpdateIrData = {
  revision: number
  manifest: Manifest
  patchedPaths: string[]
  message: string
}

export async function updateIr(
  input: UpdateIrInput,
  manager: SessionManager,
): Promise<ToolResult<UpdateIrData>> {
  let session
  try {
    session = await manager.load(input.sessionId)
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return fail('SESSION_NOT_FOUND', `Session not found: ${input.sessionId}`)
    }
    return fail('INTERNAL_ERROR', `Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Start from current manifest or empty object for first-time setup
  const base = session.design.manifest ?? ({} as Record<string, unknown>)

  // Apply patch atomically — clone first so failures leave state unchanged
  let patched: Record<string, unknown>
  const patchedPaths: string[] = []

  try {
    patched = applyJsonPatch(
      JSON.parse(JSON.stringify(base)), // deep clone
      input.patch,
      patchedPaths,
    )
  } catch (err) {
    return fail('PATCH_FAILED', `Patch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Support both flat and wrapped manifest shapes
  const manifest = ((patched['averosApplication'] as Manifest) ?? patched) as Manifest

  const updated = await manager.setManifest(input.sessionId, manifest, input.comment)

  return ok({
    revision: updated.design.revision,
    manifest,
    patchedPaths,
    message:
      `Manifest updated (revision ${updated.design.revision}). ` +
      `${patchedPaths.length} path(s) modified. Run validate_ir next.`,
  })
}

// ─── JSON Patch engine ────────────────────────────────────────────────────────

function applyJsonPatch(
  doc: Record<string, unknown>,
  ops: JsonPatchOperation[],
  patchedPaths: string[],
): Record<string, unknown> {
  for (const op of ops) {
    switch (op.op) {
      case 'add':
        setPath(doc, op.path, op.value)
        patchedPaths.push(op.path)
        break

      case 'remove':
        removePath(doc, op.path)
        patchedPaths.push(op.path)
        break

      case 'replace': {
        const existing = getPath(doc, op.path)
        if (existing === undefined) {
          throw new Error(`replace: path does not exist: ${op.path}`)
        }
        setPath(doc, op.path, op.value)
        patchedPaths.push(op.path)
        break
      }

      case 'move': {
        const val = getPath(doc, op.from)
        if (val === undefined) throw new Error(`move: source path not found: ${op.from}`)
        removePath(doc, op.from)
        setPath(doc, op.path, val)
        patchedPaths.push(op.from, op.path)
        break
      }

      case 'copy': {
        const val = getPath(doc, op.from)
        if (val === undefined) throw new Error(`copy: source path not found: ${op.from}`)
        setPath(doc, op.path, JSON.parse(JSON.stringify(val)))
        patchedPaths.push(op.path)
        break
      }

      case 'test': {
        const val = getPath(doc, op.path)
        if (JSON.stringify(val) !== JSON.stringify(op.value)) {
          throw new Error(
            `test: value at ${op.path} does not match expected. ` +
              `Got: ${JSON.stringify(val)}, expected: ${JSON.stringify(op.value)}`,
          )
        }
        break
      }

      default:
        throw new Error(`Unsupported JSON Patch operation: ${(op as any).op}`)
    }
  }

  return doc
}

// ─── Path utilities (JSON Pointer per RFC 6901) ───────────────────────────────

function parsePath(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return []
  if (!pointer.startsWith('/')) throw new Error(`Invalid JSON Pointer: ${pointer}`)
  return pointer
    .slice(1)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function getPath(doc: unknown, pointer: string): unknown {
  const parts = parsePath(pointer)
  let current = doc
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function setPath(doc: Record<string, unknown>, pointer: string, value: unknown): void {
  const parts = parsePath(pointer)
  if (parts.length === 0) {
    // Replace root — copy all properties
    Object.keys(doc).forEach((k) => delete doc[k])
    Object.assign(doc, value)
    return
  }
  let current: Record<string, unknown> = doc
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

function removePath(doc: Record<string, unknown>, pointer: string): void {
  const parts = parsePath(pointer)
  if (parts.length === 0) throw new Error('Cannot remove root')
  let current: Record<string, unknown> = doc
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>
  }
  delete current[parts[parts.length - 1]]
}
