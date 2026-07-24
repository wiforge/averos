// =============================================================================
// scripts/e2e/lib/assertions.ts
// =============================================================================

import * as fs   from 'fs'
import * as path from 'path'
// import { PHASE_ORDER } from '@averos/dag-engine'
import type { ExecutionPlan } from '@averos/dag-engine'

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export function assertPlanInvariants(plan: ExecutionPlan): void {
  assert(plan.nodes.length > 0, 'Plan must contain at least one node')

  assert(
    plan.nodes[0].phase === 'application',
    `First node must be application, got: ${plan.nodes[0].phase}`,
  )

  // No duplicate IDs
  const ids    = plan.nodes.map(n => n.id)
  const dupes  = ids.filter((id, i) => ids.indexOf(id) !== i)
  assert(dupes.length === 0, `Duplicate node IDs: ${dupes.join(', ')}`)

  // All nodes have required fields
  for (const node of plan.nodes) {
    assert(!!node.id,      `Node missing id`)
    assert(!!node.command, `Node missing command: ${node.id}`)
    assert(!!node.runner,  `Node missing runner: ${node.id}`)
    assert(!!node.phase,   `Node missing phase: ${node.id}`)
    assert(
      ['create', 'update', 'skip'].includes(node.action),
      `Node has invalid action "${node.action}": ${node.id}`,
    )
    assert(Array.isArray(node.dependsOn), `node.dependsOn must be array: ${node.id}`)
  }

  // Dependency ordering
  const index = Object.fromEntries(plan.nodes.map((n, i) => [n.id, i]))
  for (const node of plan.nodes) {
    for (const dep of node.dependsOn) {
      if (index[dep] !== undefined) {
        assert(
          index[dep] < index[node.id],
          `Dependency ordering violated: "${dep}"(${index[dep]}) must precede "${node.id}"(${index[node.id]})`,
        )
      }
    }
  }

  // Phase ordering is removed since some independant phases could be executed before or after other phases
  // Phase ordering
  // for (let i = 0; i < plan.nodes.length - 1; i++) {
  //   const cur  = plan.nodes[i]
  //   const next = plan.nodes[i + 1]
  //   const curOrd  = PHASE_ORDER[cur.phase  as keyof typeof PHASE_ORDER] ?? -1
  //   const nextOrd = PHASE_ORDER[next.phase as keyof typeof PHASE_ORDER] ?? -1
  //   assert(
  //     curOrd <= nextOrd,
  //     `Phase ordering violated [${i}→${i + 1}]: ${cur.phase}(${curOrd}) > ${next.phase}(${nextOrd})`,
  //   )
  // }

  // byPhase integrity
  const flattened = Object.values(plan.byPhase).flat()
  assert(
    flattened.length === plan.nodes.length,
    `byPhase length ${flattened.length} !== nodes.length ${plan.nodes.length}`,
  )

  // No CONFLICT warnings
  const conflicts = plan.warnings.filter(w => w.type === 'CONFLICT')
  assert(
    conflicts.length === 0,
    `Plan has ${conflicts.length} CONFLICT warnings: ${conflicts.map(w => w.nodeId).join(', ')}`,
  )
}

export function assertSummaryInvariants(
  summary:       { success: boolean; failed: number; total: number; succeeded: number; skipped: number; failures: unknown[]; durationMs: number },
  expectedTotal: number,
  label:         string,
): void {
  assert(summary.success,               `${label}: execution must succeed`)
  assert(summary.failed === 0,          `${label}: failed count must be 0, got ${summary.failed}`)
  assert(summary.total === expectedTotal,
    `${label}: total must be ${expectedTotal}, got ${summary.total}`)
  assert(
    summary.succeeded + summary.failed + summary.skipped === summary.total,
    `${label}: count invariant: ${summary.succeeded}+${summary.failed}+${summary.skipped} ≠ ${summary.total}`,
  )
  assert(summary.failures.length === 0,
    `${label}: failures array must be empty, got ${summary.failures.length}`)
  assert(summary.durationMs >= 0,       `${label}: durationMs must be non-negative`)
}

export function assertWorkspaceStructure(appRoot: string): void {
  const required = ['package.json', 'angular.json', 'tsconfig.json', 'src']
  for (const f of required) {
    assert(fs.existsSync(path.join(appRoot, f)), `Missing: ${f}`)
  }
  assert(fs.existsSync(path.join(appRoot, 'src', 'app')), 'Missing: src/app')
}

export function walkFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      results.push(...walkFiles(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}