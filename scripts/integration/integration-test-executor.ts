// =============================================================================
// scripts/integration/integration-test-executor.ts
//
// Validates:
//   - parse → DomainNode[]
//   - defaultValidator passes
//   - orchestrate → ExecutionPlan (dependency ordering)
//   - ExecutionRunner with mock adapter
//   - State persistence
//   - Checkpoint clearing on success
//   - Summary accounting invariants
// =============================================================================

import {
  orchestrateAndExecuteManifest,
  MemoryCheckpointStore,
  MemoryStateStore,
} from '@averos/executor'
import type { ExecutionContext, ExecutionResult, OrchestrationConfig } from '@averos/executor'
import { commandRegistry, emptyState } from '@averos/dag-engine'
import type { Manifest, ExecutionNode } from '@averos/dag-engine'

// ─── Golden reference manifest ────────────────────────────────────────────────

import * as fs   from 'fs'
import * as path from 'path'

const goldenManifest: Manifest = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '..', 'golden-reference', 'todoapp-manifest.json'),
    'utf-8',
  )
) as Manifest

// ─── Recording adapter ────────────────────────────────────────────────────────

const executedNodes: Array<{ id: string; command: string; args: Record<string, unknown> }> = []

const recordingAdapter = {
  async execute(node: ExecutionNode, _ctx: ExecutionContext): Promise<ExecutionResult> {
    executedNodes.push({ id: node.id, command: node.command, args: node.args as any })
    process.stdout.write(`  ✓ ${node.phase.padEnd(20)} ${node.command.padEnd(30)} ${node.id}\n`)
    return { success: true, durationMs: 0 }
  },
}

// ─── Assertions ───────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) {
    process.stderr.write(`  FAIL: ${message}\n`)
    process.exit(1)
  }
  process.stdout.write(`  PASS: ${message}\n`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {

  process.stdout.write('\n── Averos Executor Smoke Test ──────────────────────\n\n')

  const checkpointStore = new MemoryCheckpointStore()
  const stateStore      = new MemoryStateStore()

  const config: OrchestrationConfig = {
    registry:        commandRegistry,
    adapter:         recordingAdapter,
    checkpointStore,
    stateStore,
    workspaceRoot:   '/tmp/averos-smoke',
    mode:            'resilient',
    dryRun:          false,
  }

  process.stdout.write('Running full ToDoApp pipeline...\n\n')

  const summary = await orchestrateAndExecuteManifest(
    goldenManifest,
    config,
    emptyState(),
  )

  process.stdout.write('\n── Assertions ──────────────────────────────────────\n\n')

  // ── Summary invariants ─────────────────────────────────────────────────────

  assert(summary.success,    'Execution succeeded')
  assert(summary.failed === 0, `No failures (got ${summary.failed})`)
  assert(summary.total > 0,  `Total nodes > 0 (got ${summary.total})`)

  assert(
    summary.succeeded + summary.failed + summary.skipped === summary.total,
    `Count invariant: ${summary.succeeded} + ${summary.failed} + ${summary.skipped} = ${summary.total}`,
  )

  // ── Node ordering ─────────────────────────────────────────────────────────

  assert(
    executedNodes.length === summary.total,
    `Executed ${executedNodes.length} nodes, summary reports ${summary.total}`,
  )

  assert(
    executedNodes[0].command.includes('create-application') ||
    executedNodes[0].id.startsWith('application:'),
    'First executed node is application',
  )

  // ── State was persisted ───────────────────────────────────────────────────

  const state = await stateStore.load()
  assert(state !== null, 'State was persisted after execution')
  assert(
    Object.keys(state!.nodeStates).length === summary.total,
    `State contains ${Object.keys(state!.nodeStates).length} entries for ${summary.total} nodes`,
  )
  assert(
    Object.values(state!.nodeStates).every(ns => ns.state === 'SUCCESS' || ns.state === 'SKIPPED'),
    'All node states are SUCCESS or SKIPPED',
  )

  // ── Checkpoints cleared on success ────────────────────────────────────────

  const checkpoints = await checkpointStore.load()
  assert(checkpoints.size === 0, 'Checkpoints cleared after full success')

  // ── Idempotency: second run produces zero executions ──────────────────────

  process.stdout.write('\nRunning second pass (idempotency check)...\n')
  const secondExecuted: string[] = []

  const idempotentConfig: OrchestrationConfig = {
    ...config,
    adapter: {
      execute: async (node: ExecutionNode) => {
        secondExecuted.push(node.id)
        return { success: true, durationMs: 0 }
      },
    },
    stateStore,  // reuse the state written by the first run
  }

  const secondSummary = await orchestrateAndExecuteManifest(
    goldenManifest,
    idempotentConfig,
    await stateStore.load(),
  )

  assert(
    secondExecuted.length === 0,
    `Second run executed 0 nodes (idempotent) — adapter called ${secondExecuted.length} times`,
  )
  assert(secondSummary.success, 'Second run also succeeds')

  // ── Done ──────────────────────────────────────────────────────────────────

  process.stdout.write('\n── Summary ─────────────────────────────────────────\n')
  process.stdout.write(`   Total     : ${summary.total}\n`)
  process.stdout.write(`   Succeeded : ${summary.succeeded}\n`)
  process.stdout.write(`   Duration  : ${summary.durationMs}ms\n`)
  process.stdout.write(`   Mode      : ${summary.mode}\n`)
  process.stdout.write('\n✓ All smoke tests passed\n\n')
}

main().catch(err => {
  process.stderr.write(`\nFATAL: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})