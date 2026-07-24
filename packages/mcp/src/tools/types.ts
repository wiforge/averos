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
// Structured tool result types.
//
// Every MCP tool returns ToolResult<T> instead of throwing.
// LLMs handle structured failures far better than exceptions:
//   - error codes are machine-readable
//   - messages are human-readable
//   - success/failure is unambiguous
//   - no try/catch needed in server.ts
//
// Error code conventions:
//   SESSION_NOT_FOUND        — sessionId does not exist
//   NO_MANIFEST              — update_ir or validate_ir requires a manifest
//   VALIDATION_FAILED        — manifest has errors
//   NOT_VALIDATED            — build_plan requires validated manifest
//   PLAN_NOT_FOUND           — execute requires a plan
//   PLAN_STALE               — manifest changed since plan was built
//   PLAN_NOT_APPROVED        — execute requires approval
//   REVISION_NOT_FOUND       — rollback target revision does not exist
//   PATCH_FAILED             — JSON Patch application error
//   EXECUTION_FAILED         — schematics returned failures
// =============================================================================

export type ToolSuccess<T> = {
  success: true
  data: T
}

export type ToolFailure = {
  success: false
  code: ToolErrorCode
  message: string
}

export type ToolResult<T> = ToolSuccess<T> | ToolFailure

// ─── Error codes ──────────────────────────────────────────────────────────────

export type ToolErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'NO_MANIFEST'
  | 'VALIDATION_FAILED'
  | 'NOT_VALIDATED'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_STALE'
  | 'PLAN_NOT_APPROVED'
  | 'REVISION_NOT_FOUND'
  | 'PATCH_FAILED'
  | 'EXECUTION_FAILED'
  | 'INTERNAL_ERROR'

// ─── Constructors ─────────────────────────────────────────────────────────────

export function ok<T>(data: T): ToolSuccess<T> {
  return { success: true, data }
}

export function fail(code: ToolErrorCode, message: string): ToolFailure {
  return { success: false, code, message }
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isOk<T>(result: ToolResult<T>): result is ToolSuccess<T> {
  return result.success === true
}

export function isFail<T>(result: ToolResult<T>): result is ToolFailure {
  return result.success === false
}
