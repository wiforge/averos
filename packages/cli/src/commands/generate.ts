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

import * as fs   from 'fs'
import * as path from 'path'
import type { GenerateArgs }  from '../args/types'
import type { AverosConfig }  from '../config/types'
import { buildOrchestrationConfig, resolveLogsDir } from '../infra/factory'
import { formatSummary }      from '../output/formatter'
import { colors } from '../output/colors'
import { Spinner } from '../output/spinner'
import { LiveLogger } from '../output/live-logger'

export async function generateCommand(
  args:   GenerateArgs,
  config: AverosConfig,
): Promise<number> {

  if (!args.intent.trim()) {
     console.error(
      `${colors.red('✗')} Intent is required.\n` +
      `  Usage: averos generate "<intent>" [--run] [--output=manifest.json]`
      )
    return 1
  }

 // ── Lazy-import @averos/ai ────────────────────────────────────────────────
  // ai/ is an optional peer dep — CLI works without it for all other commands.
  type AverosAI = typeof import('@averos/ai')
  let runIntentPipeline: AverosAI['runIntentPipeline']
  let buildLLMAdapter:   AverosAI['buildLLMAdapter']
  
  // let runIntentPipeline: typeof import('@averos/ai').runIntentPipeline
  // let buildLLMAdapter:   typeof import('@averos/ai').buildLLMAdapter


  try {
    const ai      = await import('@averos/ai')
    runIntentPipeline = ai.runIntentPipeline
    buildLLMAdapter   = ai.buildLLMAdapter
  } catch {
    console.error(
      `${colors.red('✗')} The generate command requires @averos/ai.\n` +
      `  Run: npm install @averos/ai`
    )
    return 1
  }

  // ── Build LLM adapter ─────────────────────────────────────────────────────
  // Pass provider-specific options from config so remote/local URLs work.

  const provider = config.llmProvider ?? 'anthropic'
  const displayUrl = resolveDisplayUrl(config)

  let llm: import('@averos/ai').LLMAdapter

   try {
    llm = buildLLMAdapter(
      provider as import('@averos/ai').LLMProvider,
      {
        ollama: {
          baseUrl: config.ollamaBaseUrl,
          model:   config.ollamaModel,
          timeoutMs: config.llmTimeoutMs ?? 300_000,  // ← default 5 min for local models
        },
        local: {
          baseUrl: config.localLlmBaseUrl,
          model:   config.localLlmModel,
          timeoutMs: config.llmTimeoutMs ?? 300_000,
        },
      },
    )
  } catch (err) {
    console.error(
      `${colors.red('✗')} Failed to initialise LLM adapter: ` +
      `${err instanceof Error ? err.message : String(err)}`
    )
    return 1
  }

  // ── Live output ───────────────────────────────────────────────────────────

  const liveLogger = new LiveLogger({ verbose: args.verbose })
  const spinner    = new Spinner()

  liveLogger.debug(`Provider : ${provider}${displayUrl ? ` → ${displayUrl}` : ''}`)
  liveLogger.debug(`Intent   : ${args.intent}`)
  liveLogger.debug(`Output   : ${path.resolve(args.workspaceRoot, args.manifestPath)}`)
  liveLogger.debug(`Execute  : ${args.executeAfter}`)

  // ── Build orchestration config ────────────────────────────────────────────

  const logsDir    = resolveLogsDir(args.workspaceRoot, config.logsDir)

   const orchConfig = buildOrchestrationConfig({
    workspaceRoot: args.workspaceRoot,
    mode:          args.mode          ?? config.mode ?? 'resilient',
    dryRun:        !args.executeAfter,
    verbose:       args.verbose,
    localTgz:      config.localTgz,
    averosVersion: config.averosVersion,
    logsDir,
  }, config)

   const state = await orchConfig.stateStore.load()

  // ── Generate ──────────────────────────────────────────────────────────────

   spinner.start(
    `Generating manifest via ${colors.cyan(provider)}` +
    (displayUrl ? ` ${colors.dim(`(${displayUrl})`)}` : '') +
    `…`
  )

  let result: Awaited<ReturnType<typeof runIntentPipeline>>

  try {
    result = await runIntentPipeline({
      intent:       args.intent,
      llm,
      config:       orchConfig,
      state,
      executeAfter: args.executeAfter,
      generateOpts: {
        maxRetries: 3,
        onValidationFailure: (errors, attempt) => {
          spinner.update(
            `Attempt ${attempt}/3 — fixing ${errors.length} validation error(s)…`
          )
          if (args.verbose) {
            errors.forEach(e => liveLogger.debug(`  - ${e}`))
          }
        },
      },
    })
  } catch (err) {
    spinner.fail(
      `Generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
    return 1
  }
  const { summary, manifest, manifestAttempts, warnings } = result

   spinner.succeed(
    `Manifest generated in ${colors.cyan(String(manifestAttempts))} ` +
    `LLM attempt(s)`
  )

  // ── Warnings ──────────────────────────────────────────────────────────────
   warnings.forEach(w =>
    process.stdout.write(`  ${colors.yellow('⚠')}  ${w}\n`)
  )

  // ── Write manifest to disk────────────────────────────────────────────────────────

  const outPath = path.resolve(args.workspaceRoot, args.manifestPath)

   try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8')
    process.stdout.write(
      `  ${colors.green('✓')} Manifest written to ${colors.dim(outPath)}\n`
    )
  } catch (err) {
    console.error(
      `${colors.red('✗')} Failed to write manifest: ` +
      `${err instanceof Error ? err.message : String(err)}`
    )
    return 1
  }

   // ── Execution (when --run) ────────────────────────────────────────────────

  if (args.executeAfter) {
    process.stdout.write(formatSummary(summary, false))
    return summary.success ? 0 : 1
  }

  process.stdout.write(
    `\n  ${colors.dim('Next:')} ${colors.cyan('averos run')} ` +
    `${colors.dim(outPath)}\n\n`
  )

  return 0
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveDisplayUrl(config: AverosConfig): string {
  switch (config.llmProvider) {
    case 'ollama': return config.ollamaBaseUrl   ?? 'http://localhost:11434'
    case 'local':  return config.localLlmBaseUrl ?? 'http://localhost:1234'
    default:       return ''
  }
}