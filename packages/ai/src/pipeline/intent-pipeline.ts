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

import type { State }           from '@averos/dag-engine'
import { generateManifest }     from '../generation/manifest-generator'
import type { LLMAdapter }      from '../adapters/types'
import type { GenerateManifestOptions } from '../generation/manifest-generator'
import type { RunnerSummary }   from '@averos/executor'
import type { OrchestrationConfig } from '@averos/executor'

export type IntentPipelineOptions = {
  intent:        string
  llm:           LLMAdapter
  config:        OrchestrationConfig
  state?:        State | null
  executeAfter?: boolean
  generateOpts?: GenerateManifestOptions
}

export type IntentPipelineResult = {
  summary:          RunnerSummary
  manifest:         import('@averos/dag-engine').Manifest
  manifestAttempts: number
  warnings:         string[]
}

export async function runIntentPipeline(
  opts: IntentPipelineOptions,
): Promise<IntentPipelineResult> {

  const { orchestrateAndExecuteManifest } = await import('@averos/executor')

  const { manifest, attempts, warnings } = await generateManifest(
    opts.intent,
    opts.llm,
    {
      maxRetries: 3,
      onValidationFailure(errors, attempt) {
        console.warn(`[AI] Attempt ${attempt} — ${errors.length} error(s)`)
        errors.forEach(e => console.warn(`  - ${e}`))
      },
      ...opts.generateOpts,
    },
  )

  const shouldExecute = opts.executeAfter !== false

  const summary = shouldExecute
    ? await orchestrateAndExecuteManifest(manifest, opts.config, opts.state ?? null)
    : { total: 0, succeeded: 0, failed: 0, skipped: 0, cancelled: 0,
        durationMs: 0, mode: opts.config.mode ?? 'resilient',
        success: true, failures: [] } as RunnerSummary

  return { summary, manifest, manifestAttempts: attempts, warnings }
}