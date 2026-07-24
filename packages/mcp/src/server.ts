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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { SessionManager } from './session/manager'
import { sessionIdSchema, jsonPatchSchema, executionModeSchema } from './tools/schemas'
import { createSession } from './tools/create-session'
import { getIr } from './tools/get-ir'
import { updateIr } from './tools/update-ir'
import { validateIr } from './tools/validate-ir'
import { buildPlan } from './tools/build-plan'
import { approvePlan } from './tools/approve-plan'
import { executePlan } from './tools/execute-plan'
import { getStatus } from './tools/get-status'
import { listRevisions } from './tools/list-revisions'
import { rollbackRevision } from './tools/rollback-revision'
import { diffIr } from './tools/diff-ir'
import type { McpConfig } from './config/types'
import { FileSessionStore } from './session/store/file'
import { ToolResult } from './tools/types'

// =============================================================================
// toMcpResponse — uniform ToolResult → MCP response adapter
// =============================================================================

function toMcpResponse(result: ToolResult<{ display?: string; message?: string } | unknown>) {
  if (result.success) {
    const data = result.data as Record<string, unknown>
    const text =
      (data['display'] as string | undefined) ??
      (data['message'] as string | undefined) ??
      JSON.stringify(data, null, 2)
    return { content: [{ type: 'text' as const, text }] }
  }
  return {
    content: [
      {
        type: 'text' as const,
        text: `❌ ${result.code}: ${result.message}`,
      },
    ],
    isError: true,
  }
}

// =============================================================================
// Server factory
// =============================================================================

export function createAverosServer(config: McpConfig): McpServer {
  const store = new FileSessionStore(config.sessionDir)
  const sessionManager = new SessionManager(store)

  const server = new McpServer({
    name: 'averos-dag-engine',
    version: '2.0.0',
  })

  // ── create_session ────────────────────────────────────────────────────────

  server.registerTool(
    'create_session',
    {
      description: [
        'Creates a new design session. Call this first before any other tool.',
        'Returns a sessionId required by all other tools.',
        'One session = one application being designed.',
      ].join(' '),
      inputSchema: {
        workspaceDir: z
          .string()
          .describe('Absolute path to the workspace where the app will be generated.'),
        config: z
          .object({
            mode: executionModeSchema.optional(),
            timeoutMs: z.number().int().positive().optional(),
            maxAttempts: z.number().int().min(1).max(5).optional(),
            dryRun: z.boolean().optional(),
          })
          .optional()
          .describe('Per-session execution policy overrides.'),
      },
    },
    async ({ workspaceDir, config: sessionConfig }) => {
      const result = await createSession({ workspaceDir, config: sessionConfig }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── get_ir ────────────────────────────────────────────────────────────────

  server.registerTool(
    'get_ir',
    {
      description: 'Returns the current session manifest (JSON IR) and its revision number.',
      inputSchema: { sessionId: sessionIdSchema },
    },
    async ({ sessionId }) => {
      const result = await getIr({ sessionId }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── update_ir ─────────────────────────────────────────────────────────────

  server.registerTool(
    'update_ir',
    {
      description: [
        'Applies JSON Patch operations (RFC 6902) to the session manifest (JSON IR).',
        'Use op=add to insert, op=replace to update, op=remove to delete.',
        'Paths follow JSON Pointer notation (RFC 6901): /entities/0/name',
        'After updating, always call validate_ir to check for errors before build_execution_plan.',
        'Use this tool whenever the user asks to add, modify, or remove',
        'entities, fields, services, use cases, or any other application component.',
      ].join(' '),
      inputSchema: {
        sessionId: sessionIdSchema,
        patch: jsonPatchSchema.describe(
          'Array of RFC 6902 JSON Patch operations to apply to the manifest. Partial manifest to merge. Can be a full manifest or just the changed portions.',
        ),
        comment: z
          .string()
          .optional()
          .describe('Human-readable description stored in revision history.'),
      },
    },
    async ({ sessionId, patch, comment }) => {
      const result = await updateIr({ sessionId, patch: patch as any, comment }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── reset_ir ──────────────────────────────────────────────────────────────

  server.registerTool(
    'reset_ir',
    {
      description: [
        'Replaces the entire manifest with a new one.',
        'Use update_ir for surgical edits. Use this for full rewrites.',
      ].join(' '),
      inputSchema: {
        sessionId: sessionIdSchema,
        manifest: z
          .record(z.string(), z.unknown())
          .describe('Complete manifest object to replace the current one.'),
        comment: z
          .string()
          .optional()
          .describe('Human-readable description stored in revision history.'),
      },
    },
    async ({ sessionId, manifest, comment }) => {
      // Full replacement is add on root — equivalent to replace /
      const result = await updateIr(
        {
          sessionId,
          patch: [{ op: 'add', path: '', value: manifest }],
          comment: comment ?? 'Full manifest replacement',
        },
        sessionManager,
      )
      return toMcpResponse(result)
    },
  )

  // ── diff_ir ───────────────────────────────────────────────────────────────

  server.registerTool(
    'diff_ir',
    {
      description: [
        'Shows what changed between manifest versions.',
        'Modes: current_vs_executed (changes since last run),',
        'revision_vs_revision (two specific history revisions),',
        'current_vs_revision (current vs a historical revision).',
        'Use list_revisions to see available revision numbers.',
      ].join(' '),
      inputSchema: {
        sessionId: sessionIdSchema,
        mode: z
          .enum(['current_vs_executed', 'revision_vs_revision', 'current_vs_revision'])
          .describe(
            'current_vs_executed: what changed since last run. ' +
              'revision_vs_revision: compare two history entries. ' +
              'current_vs_revision: current manifest vs a historical entry.',
          ),
        fromRevision: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Base revision (required for revision_vs_revision mode).'),
        toRevision: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            'Target revision (required for revision_vs_revision and current_vs_revision modes).',
          ),
      },
    },
    async ({ sessionId, mode, fromRevision, toRevision }) => {
      const result = await diffIr({ sessionId, mode, fromRevision, toRevision }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── validate_ir ───────────────────────────────────────────────────────────

  server.registerTool(
    'validate_ir',
    {
      description: [
        'Validates the manifest against all schema, referential, and constraint rules.',
        'Must pass before build_execution_plan.',
        'Returns errors that must be fixed and warnings that are informational.',
      ].join(' '),
      inputSchema: { sessionId: sessionIdSchema },
    },
    async ({ sessionId }) => {
      const result = await validateIr({ sessionId }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── build_execution_plan ──────────────────────────────────────────────────

  server.registerTool(
    'build_execution_plan',
    {
      description: [
        'Builds the execution plan by diffing the validated manifest against current state.',
        'Returns an ordered list of operations for user review.',
        'Present this to the user and ask for approval before calling execute_plan.',
      ].join(' '),
      inputSchema: { sessionId: sessionIdSchema },
    },
    async ({ sessionId }) => {
      const result = await buildPlan({ sessionId }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── approve_plan ──────────────────────────────────────────────────────────

  server.registerTool(
    'approve_plan',
    {
      description: [
        'Records user approval or rejection of the execution plan.',
        'ONLY call with decision=approve after presenting the plan and',
        'receiving explicit user confirmation to proceed.',
        'Call with decision=reject if the user wants changes.',
      ].join(' '),
      inputSchema: {
        sessionId: sessionIdSchema,
        decision: z
          .enum(['approve', 'reject'])
          .describe('approve: proceed with execution. reject: go back to editing.'),
        reason: z
          .string()
          .optional()
          .describe('Optional reason for rejection, stored in audit trail.'),
      },
    },
    async ({ sessionId, decision, reason }) => {
      const result = await approvePlan({ sessionId, decision, reason }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── execute_plan ──────────────────────────────────────────────────────────

  server.registerTool(
    'execute_plan',
    {
      description: [
        'Executes the approved plan via a real execution adapter (example: Angular schematics).',
        'Requires prior approve_plan with decision=approve.',
        'Has real filesystem side effects — generates application files.',
        'Never call this without explicit user confirmation.',
      ].join(' '),
      inputSchema: {
        sessionId: sessionIdSchema,
        dryRun: z
          .boolean()
          .optional()
          .describe('If true, print commands without executing. Overrides session config.'),
        mode: executionModeSchema
          .optional()
          .describe('Overrides session config for this run only.'),
      },
    },
    async ({ sessionId, dryRun, mode }) => {
      const result = await executePlan({ sessionId, dryRun, mode }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── get_status ────────────────────────────────────────────────────────────

  server.registerTool(
    'get_status',
    {
      description: 'Returns current session state, pipeline phase, and last execution summary.',
      inputSchema: { sessionId: sessionIdSchema },
    },
    async ({ sessionId }) => {
      const result = await getStatus({ sessionId }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── list_revisions ────────────────────────────────────────────────────────

  server.registerTool(
    'list_revisions',
    {
      description: 'Lists available manifest revisions for undo/audit. Use with rollback_revision.',
      inputSchema: { sessionId: sessionIdSchema },
    },
    async ({ sessionId }) => {
      const result = await listRevisions({ sessionId }, sessionManager)
      return toMcpResponse(result)
    },
  )

  // ── rollback_revision ─────────────────────────────────────────────────────

  server.registerTool(
    'rollback_revision',
    {
      description: [
        'Restores the manifest to a previous revision.',
        'Call list_revisions first to see available revision numbers.',
        'After rollback, run validate_ir and build_execution_plan again.',
      ].join(' '),
      inputSchema: {
        sessionId: sessionIdSchema,
        revision: z
          .number()
          .int()
          .positive()
          .describe('Revision number to restore. Get this from list_revisions.'),
      },
    },
    async ({ sessionId, revision }) => {
      const result = await rollbackRevision({ sessionId, revision }, sessionManager)
      return toMcpResponse(result)
    },
  )

  return server
}
