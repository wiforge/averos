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
// Shared zod schemas used across tool definitions.
// =============================================================================

import { z } from 'zod'

export const sessionIdSchema = z.string().uuid({
  message: 'sessionId must be a valid UUID from create_session',
})

export const jsonPatchOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add'),
    path: z.string(),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal('remove'),
    path: z.string(),
  }),
  z.object({
    op: z.literal('replace'),
    path: z.string(),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal('move'),
    from: z.string(),
    path: z.string(),
  }),
  z.object({
    op: z.literal('copy'),
    from: z.string(),
    path: z.string(),
  }),
  z.object({
    op: z.literal('test'),
    path: z.string(),
    value: z.unknown(),
  }),
])

export const jsonPatchSchema = z.array(jsonPatchOperationSchema).min(1)

export const executionModeSchema = z
  .enum(['strict', 'resilient'])
  .describe(
    'Execution mode. resilient continues independent branches on failure. Default: resilient.',
  )
