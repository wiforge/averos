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

import { parse, defaultValidator } from '@averos/dag-engine'
import type { Manifest }                   from '@averos/dag-engine'
import type { LLMAdapter }                 from '../adapters/types'
import { buildInitialPrompt, buildRetryPrompt } from '../prompts/retry'

export type GenerateManifestOptions = {
  maxRetries?:          number
  onValidationFailure?: (errors: string[], attempt: number) => void
}

export type GenerateManifestResult = {
  manifest:  Manifest
  attempts:  number
  warnings:  string[]
}

export async function generateManifest(
  userIntent: string,
  llm:        LLMAdapter,
  opts:       GenerateManifestOptions = {},
): Promise<GenerateManifestResult> {

  const maxRetries = opts.maxRetries ?? 3
  let lastErrors:  string[] = []
  let lastRaw      = ''

  for (let attempt = 1; attempt <= maxRetries; attempt++) {

    const prompt = attempt === 1
      ? buildInitialPrompt(userIntent)
      : buildRetryPrompt(userIntent, lastRaw, lastErrors)

    const raw = await llm.complete(prompt)
    lastRaw   = raw

    let parsed: unknown
    try {
      parsed = JSON.parse(raw.trim())
    } catch {
      lastErrors = ['Response is not valid JSON']
      opts.onValidationFailure?.(lastErrors, attempt)
      continue
    }

    const manifest = ((parsed as any).averosApplication ?? parsed) as Manifest
    const nodes    = parse(manifest)
    const result   = defaultValidator.validate(nodes)

    const errors   = result.errors.filter(e => e.severity === 'error')
    const warnings = result.errors.filter(e => e.severity === 'warning')

    if (errors.length === 0) {
      return { manifest, attempts: attempt, warnings: warnings.map(w => w.message) }
    }

    lastErrors = errors.map(e => e.message)
    opts.onValidationFailure?.(lastErrors, attempt)
  }

  throw new Error(
    `Failed to generate valid manifest after ${maxRetries} attempts.\n` +
    `Last errors:\n${lastErrors.map(e => `  - ${e}`).join('\n')}`
  )
}