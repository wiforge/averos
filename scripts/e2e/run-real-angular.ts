// =============================================================================
// scripts/e2e/run-real-angular.ts
//
// Shared E2E test runner — used by both remote and local harnesses.
//
// Compile with:
//   npx tsc --project scripts/e2e/tsconfig.json
// =============================================================================

import * as fs   from 'fs'
import * as path from 'path'

import {
  orchestrateAndExecuteManifest,
  FileCheckpointStore,
  FileStateStore,
  AngularSchematicsAdapter,
} from '@averos/executor'
import type {
  OrchestrationConfig,
  ExecutionContext,
  ExecutionResult,
  ExecutionState,
} from '@averos/executor'


import {
  commandRegistry,
  emptyState,
  parse,
  defaultValidator,
  orchestrate,
  extractManifest,
} from '@averos/dag-engine'
import type { Manifest, ExecutionPlan, ExecutionNode, ArgValue } from '@averos/dag-engine'

import { bootstrapWorkspace }     from './lib/workspace'
import { NodeLogger }             from './lib/logger'
import { assert, assertPlanInvariants, assertSummaryInvariants,
         assertWorkspaceStructure, walkFiles } from './lib/assertions'
import type { E2EArgs, E2EResults, TestResult, NodeLog } from './lib/types'

// =============================================================================
// Parse CLI args
// =============================================================================

function parseArgs(): E2EArgs {
  const map: Record<string, string> = {}
  for (const arg of process.argv.slice(2)) {
    const [k, ...rest] = arg.replace(/^--/, '').split('=')
    map[k] = rest.join('=')
  }
  return {
    manifest:       map['manifest']       ?? '',
    workspace:      map['workspace']      ?? '',
    stateDir:       map['state-dir']      ?? '',
    logsDir:        map['logs-dir']       ?? '',
    results:        map['results']        ?? '',
    timeoutMs:      parseInt(map['timeout'] ?? '600000', 10),
    localTgz:       map['local-tgz']      || undefined,
    averosVersion:  map['averos-version'] || undefined,
    dryRun:         map['dry-run'] === 'true',
  }
}

// =============================================================================
// Event collector with per-node log capture
// =============================================================================

class InstrumentedAdapter {

  private readonly logs:    NodeLog[]    = []
  private readonly nodeLogger: NodeLogger
  private readonly real:       AngularSchematicsAdapter | null
  private readonly dryRun:     boolean

  constructor(opts: { logsDir: string; dryRun: boolean }) {
    this.nodeLogger = new NodeLogger(opts.logsDir)
    this.dryRun     = opts.dryRun
    this.real       = opts.dryRun ? null : new AngularSchematicsAdapter()
  }

  get adapter() {
    const self = this
    return {
      async execute(node: ExecutionNode, ctx: ExecutionContext, state: ExecutionState): Promise<ExecutionResult> {

        const startedAt  = new Date().toISOString()
        const startMs    = Date.now()

        let result: ExecutionResult
        if (self.dryRun || !self.real) {
          result = { success: true, durationMs: 0, stdout: `[dry-run] ${node.command}` }
        } else {
          result = await self.real.execute(node, ctx, state)
        }

        const finishedAt  = new Date().toISOString()
        const durationMs  = Date.now() - startMs

        const entry: NodeLog = {
          nodeId:     node.id,
          command:    node.command,
          runner:     node.runner,
          args:       node.args as Record<string, unknown>,
          startedAt,
          finishedAt,
          durationMs,
          exitCode:   result.failure?.exitCode,
          stdout:     result.stdout ?? '',
          stderr:     result.stderr ?? '',
          success:    result.success,
        }

        self.nodeLogger.writeNodeLog(entry)
        self.logs.push(entry)

        return result
      },
    }
  }

  flushSummary(): void {
    this.nodeLogger.writeSummary(this.logs)
  }

  get allLogs(): NodeLog[]    { return this.logs }
  get logsDir():  string       { return this.nodeLogger.logsDirectory }
}

// =============================================================================
// Runner helper
// =============================================================================

async function runTest(
  name:    string,
  fn:      () => Promise<void>,
  results: TestResult[],
): Promise<boolean> {

  const start = Date.now()
  process.stdout.write(`  \x1b[2m▶\x1b[0m ${name}`)

  try {
    await fn()
    const ms = Date.now() - start
    process.stdout.write(`\r  \x1b[32m✓\x1b[0m ${name} \x1b[2m(${ms}ms)\x1b[0m\n`)
    results.push({ name, passed: true, durationMs: ms })
    return true
  } catch (err) {
    const ms  = Date.now() - start
    const msg = err instanceof Error ? err.message : String(err)
    process.stdout.write(`\r  \x1b[31m✗\x1b[0m ${name} \x1b[2m(${ms}ms)\x1b[0m\n`)
    process.stdout.write(`      \x1b[31m→ ${msg}\x1b[0m\n`)
    results.push({ name, passed: false, durationMs: ms, error: msg })
    return false
  }
}

function writeResults(args: E2EArgs, results: TestResult[], start: number): void {
  if (!args.results) return
  const out: E2EResults = {
    totalDurationMs: Date.now() - start,
    tests:           results,
    success:         results.every(r => r.passed),
    workspaceDir:    args.workspace,
    logsDir:         args.logsDir,
  }
  fs.mkdirSync(path.dirname(args.results), { recursive: true })
  fs.writeFileSync(args.results, JSON.stringify(out, null, 2), 'utf-8')
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {

  const args    = parseArgs()
  const results: TestResult[] = []
  const start   = Date.now()

  // ── Logging ────────────────────────────────────────────────────────────────

  const logsDir = args.logsDir || path.join(args.stateDir, 'logs')
  fs.mkdirSync(logsDir, { recursive: true })
  fs.mkdirSync(args.stateDir, { recursive: true })

  const instrumented = new InstrumentedAdapter({
    logsDir: logsDir,
    dryRun:  args.dryRun,
  })

  // ── State / checkpoint paths ──────────────────────────────────────────────

  const statePath      = path.join(args.stateDir, 'state.json')
  const checkpointPath = path.join(args.stateDir, 'checkpoints.json')
  const stateStore     = new FileStateStore(statePath)

  let manifest!:      Manifest
  let plan!:          ExecutionPlan
  let expectedTotal!: number
  let appRoot!:       string

  // ==========================================================================
  // TEST 1 — Manifest validation
  // ==========================================================================

  await runTest('Manifest passes all validation rules', async () => {
    const raw     = JSON.parse(fs.readFileSync(args.manifest, 'utf-8'))
    manifest      = extractManifest(raw) as Manifest

    const nodes   = parse(manifest)
    assert(nodes.length > 0, `Must parse at least one node, got ${nodes.length}`)

    const result  = defaultValidator.validate(nodes)

    if (!result.valid) {
      const errors = result.errors
        .filter(e => e.severity === 'error')
        .map(e => `  - ${e.message}`)
        .join('\n')
      throw new Error(`Manifest validation failed:\n${errors}`)
    }

    const warnings = result.errors.filter(e => e.severity === 'warning')
    process.stdout.write(`\n    \x1b[2mparsed ${nodes.length} nodes, ${warnings.length} warning(s)\x1b[0m\n`)
  }, results)

  if (!manifest) {
    writeResults(args, results, start)
    process.exit(1)
  }

  // ==========================================================================
  // TEST 2 — Execution plan invariants
  // ==========================================================================

  await runTest('Execution plan satisfies all invariants', async () => {
    plan          = orchestrate(manifest, emptyState(), commandRegistry)
    expectedTotal = plan.nodes.length

    assertPlanInvariants(plan)

    const byAction = {
      create: plan.nodes.filter(n => n.action === 'create').length,
      update: plan.nodes.filter(n => n.action === 'update').length,
      skip:   plan.nodes.filter(n => n.action === 'skip').length,
    }

    process.stdout.write(
      `\n    \x1b[2m${plan.nodes.length} nodes — ` +
      `create:${byAction.create} update:${byAction.update} skip:${byAction.skip} ` +
      `warnings:${plan.warnings.length}\x1b[0m\n`
    )

    // Write plan to logs
    fs.writeFileSync(
      path.join(logsDir, 'execution-plan.json'),
      JSON.stringify(plan, null, 2),
      'utf-8',
    )
  }, results)

  // ==========================================================================
  // TEST 3 — Workspace bootstrap (install only)
  // ==========================================================================

  await runTest('Workspace install succeeds', async () => {

    const appName = (manifest as any).applicationName ?? 'AverosApp'

    const bootstrap = await bootstrapWorkspace({
      workspaceDir:  args.workspace,
      appName,
      localTgz:      args.localTgz,
      averosVersion: args.averosVersion,
      defaultLang:   (manifest as any).defaultLanguageCode ?? 'en',
      enableAuth:    (manifest as any).enableAuthentication === true,
      enableMapping: (manifest as any).enableExternalEntityMapping === true,
      timeoutMs:     args.timeoutMs,
      logsDir,
    })

    appRoot = bootstrap.appRoot

    // workspaceDir must exist after install
    assert(
      fs.existsSync(args.workspace),
      `Workspace directory not found: ${args.workspace}`,
    )

    // appRoot does NOT exist yet — create-application creates it
    process.stdout.write(`\n    \x1b[2minstall done — application will be created under: ${appRoot}\x1b[0m\n`)
}, results)

  // ==========================================================================
  // TEST 4 — Full pipeline execution (real schematics - create-application runs here and creates appRoot )
  // ==========================================================================

  await runTest(
    args.dryRun
      ? 'Execution plan simulates successfully (dry-run mode)'
      : 'Full pipeline executes successfully with real schematics',
    async () => {

      // const tgzName = args.localTgz ? path.basename(args.localTgz) : undefined

      const nodeArgOverrides: Record<string, Record<string, ArgValue>> | undefined =
        args.localTgz && args.averosVersion
          ? {
              'create-application': {
                development:      true,
                'averos-version': args.averosVersion,
              },
            }
          : undefined

      const config: OrchestrationConfig = {
        registry:        commandRegistry,
        adapter:         instrumented.adapter,
        checkpointStore: new FileCheckpointStore(checkpointPath),
        stateStore,
        workspaceRoot:   appRoot,
        mode:            'resilient',
        dryRun:          args.dryRun,
        timeoutMs:       args.timeoutMs,
        nodeArgOverrides,
      }

      const summary = await orchestrateAndExecuteManifest(
        manifest,
        config,
        emptyState(),
      )
      // Print per-node outcome
      for (const log of instrumented.allLogs) {
        const icon = log.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
        const dur  = `${log.durationMs}ms`.padStart(7)
        process.stdout.write(`\n    ${icon} ${dur}  ${log.nodeId}`)
      }
      process.stdout.write('\n')

      // Print failures inline
      if (summary.failures.length > 0) {
        process.stdout.write('\n    \x1b[31mFailures:\x1b[0m\n')
        for (const f of summary.failures) {
          process.stdout.write(`    → ${f.nodeId}: ${f.message}\n`)
          const logFile = path.join(logsDir, f.nodeId.replace(/[^a-zA-Z0-9_-]/g, '_') + '__' + '.log')
          if (require('fs').existsSync(logFile)) {
            process.stdout.write(`      log: ${logFile}\n`)
          }
        }
      }

      assertSummaryInvariants(summary, expectedTotal, 'First run')

      process.stdout.write(
        `\n    \x1b[2m${summary.total} nodes — ` +
        `${summary.succeeded} succeeded, ${summary.skipped} skipped, ` +
        `${summary.failed} failed — ${summary.durationMs}ms\x1b[0m\n`
      )

      // Flush the per-node execution summary
      instrumented.flushSummary()
      process.stdout.write(`\n    \x1b[2mlogs: ${logsDir}\x1b[0m\n`)

      if (!args.dryRun) {
       const appName = (manifest as any).applicationName ?? 'AverosApp'

       const actualAppRoot = path.join(appRoot, appName)

        assert(fs.existsSync(actualAppRoot),
                `Application directory not created by pipeline: ${actualAppRoot}`,)
        // Update for subsequent tests
        appRoot = actualAppRoot
    }
    },
    results,
  )

  // ==========================================================================
  // TEST 5 — State persistence
  // ==========================================================================

  await runTest('State persisted correctly after execution', async () => {
    if (args.dryRun) {
      process.stdout.write(
        '\n    [dry-run] state persistence intentionally skipped\n'
      )
      return
    }
    const state = await stateStore.load()

    assert(state !== null, 'State file must exist')
    assert(
      typeof state!.builtAt === 'string' && state!.builtAt.length > 0,
      'State must have builtAt timestamp',
    )

    const nodeStateEntries = Object.entries(state!.nodeStates)
    assert(nodeStateEntries.length > 0, 'State must contain node states')

    const badStates = nodeStateEntries.filter(
      ([, ns]) => ns.state !== 'SUCCESS' && ns.state !== 'SKIPPED'
    )
    assert(
      badStates.length === 0,
      `Unexpected node states: ${badStates.map(([id, ns]) => `${id}=${ns.state}`).join(', ')}`,
    )

    const successCount = nodeStateEntries.filter(([, ns]) => ns.state === 'SUCCESS').length
    process.stdout.write(
      `\n    \x1b[2m${successCount}/${nodeStateEntries.length} nodes SUCCESS\x1b[0m\n`
    )
  }, results)

  // ==========================================================================
  // TEST 6 — Checkpoints cleared
  // ==========================================================================

  await runTest('Checkpoints cleared after full success', async () => {
    const store       = new FileCheckpointStore(checkpointPath)
    const checkpoints = await store.load()
    if (args.dryRun) {
      process.stdout.write(
        '\n    [dry-run] Checkpoints not cleared in dry-run => test intentionally skipped\n'
      )
      return
    }
    assert(checkpoints.size === 0,
      `Expected empty checkpoints, found ${checkpoints.size}`)
  }, results)

  // ==========================================================================
  // TEST 7 — Workspace structure
  // ==========================================================================

  await runTest('Angular workspace structure is correct', async () => {
    if (args.dryRun) {
      process.stdout.write(
        '\n    [dry-run] workspace structure verification skipped durin dry-run\n'
      )
      return
    }
    assertWorkspaceStructure(appRoot)

    const tsFiles = walkFiles(path.join(appRoot, 'src', 'app'), '.ts')
    assert(tsFiles.length > 0, 'No TypeScript files in src/app')

    process.stdout.write(`\n    \x1b[2m${tsFiles.length} TypeScript files in src/app\x1b[0m\n`)
  }, results)

  // ==========================================================================
  // TEST 8 — Idempotency
  // ==========================================================================

  await runTest('Second run is fully idempotent', async () => {

    if (args.dryRun) {
      process.stdout.write(
        '\n    [dry-run] dry-run intentionally never saves state -> test skipped\n'
      )
      return
    }
    const savedState = await stateStore.load()
    assert(savedState !== null, 'Saved state must exist for idempotency check')

    const adapterCalls: string[] = []
    const idempotentConfig: OrchestrationConfig = {
      registry: commandRegistry,
      adapter: {
        async execute(node: ExecutionNode): Promise<ExecutionResult> {
          adapterCalls.push(node.id)
          return { success: true, durationMs: 0 }
        },
      },
      checkpointStore: new FileCheckpointStore(
        path.join(args.stateDir, 'checkpoints-2nd.json')
      ),
      stateStore: new FileStateStore(
        path.join(args.stateDir, 'state-2nd.json')
      ),
      workspaceRoot: appRoot,
      mode:          'resilient',
      dryRun:        false,
      timeoutMs:     args.timeoutMs,
    }

    const second = await orchestrateAndExecuteManifest(
      manifest,
      idempotentConfig,
      savedState,
    )

    assert(
      adapterCalls.length === 0,
      `Adapter called ${adapterCalls.length} times on second run. ` +
      `Re-executed: ${adapterCalls.slice(0, 5).join(', ')}`,
    )
    assert(second.success, 'Second run must succeed')

    process.stdout.write(
      `\n    \x1b[2m${second.total} nodes — ` +
      `${second.skipped} skipped, 0 re-executed\x1b[0m\n`
    )
  }, results)

  // ==========================================================================
  // TEST 9 — Checkpoint recovery
  // ==========================================================================

  await runTest('Checkpoint recovery skips pre-completed nodes', async () => {

    const partialCheckpointStore = new FileCheckpointStore(
      path.join(args.stateDir, 'checkpoints-partial.json')
    )

    const halfNodes = plan.nodes.slice(0, Math.floor(plan.nodes.length / 2))
    for (const node of halfNodes) {
      await partialCheckpointStore.save({
        nodeId: node.id, status: 'SUCCESS',
        updatedAt: new Date().toISOString(),
      })
    }

    const recoveryExecuted: string[] = []
    const recoveryConfig: OrchestrationConfig = {
      registry: commandRegistry,
      adapter: {
        async execute(node: ExecutionNode): Promise<ExecutionResult> {
          recoveryExecuted.push(node.id)
          return { success: true, durationMs: 0 }
        },
      },
      checkpointStore: partialCheckpointStore,
      stateStore:      new FileStateStore(path.join(args.stateDir, 'state-partial.json')),
      workspaceRoot:   appRoot,
      mode:            'resilient',
      dryRun:          true,
      timeoutMs:       args.timeoutMs,
    }

    const recovery = await orchestrateAndExecuteManifest(
      manifest, recoveryConfig, emptyState()
    )

    const reExecCheckpointed = recoveryExecuted.filter(
      id => halfNodes.some(n => n.id === id)
    )

    assert(
      reExecCheckpointed.length === 0,
      `${reExecCheckpointed.length} pre-checkpointed nodes were re-executed: ` +
      reExecCheckpointed.slice(0, 3).join(', '),
    )
    assert(recovery.success, 'Recovery run must succeed')

    process.stdout.write(
      `\n    \x1b[2mpre-seeded ${halfNodes.length}/${plan.nodes.length} checkpoints — ` +
      `${recoveryExecuted.length} remaining nodes executed\x1b[0m\n`
    )
  }, results)

  // ==========================================================================
  // Write results + exit
  // ==========================================================================

  writeResults(args, results, start)

  const passed = results.filter(r => r.passed).length
  const failed = results.length - passed

  process.stdout.write('\n')
  process.stdout.write(`\x1b[1mResults: ${passed}/${results.length} passed\x1b[0m\n`)

  if (failed > 0) {
    process.stdout.write(`\x1b[31m${failed} test(s) failed\x1b[0m\n`)
    process.exit(1)
  } else {
    process.stdout.write(`\x1b[32mAll E2E tests passed\x1b[0m\n`)
    process.exit(0)
  }
}

main().catch(err => {
  process.stderr.write(`\nFATAL: ${err instanceof Error ? err.message : String(err)}\n`)
  if (err instanceof Error && err.stack) process.stderr.write(err.stack + '\n')
  process.exit(1)
})