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
// tests/renderers/plan-renderer.test.ts
// =============================================================================

import { ExecutionNode, ExecutionPlan } from '@averos/dag-engine'
import { renderPlanForLLM, renderPlanSummaryForLLM } from '../../src/renderers/plan-renderer'

function makeNode(overrides: Partial<ExecutionNode> = {}): ExecutionNode {
  return {
    id: 'entity:Task',
    phase: 'entity',
    command: 'averos-entity',
    runner: 'ng',
    args: { name: 'Task' },
    dependsOn: [],
    action: 'create',
    ...overrides,
  }
}

function makePlan(nodes: ExecutionNode[], warnings: any[] = []): ExecutionPlan {
  const byPhase: ExecutionPlan['byPhase'] = {} as any
  return { nodes, byPhase, warnings }
}

describe('renderPlanForLLM', () => {
  it('includes Execution Plan header', () => {
    const plan = makePlan([makeNode()])
    const output = renderPlanForLLM(plan)
    expect(output).toContain('Execution Plan')
  })

  it('reports total actionable operation count', () => {
    const nodes = [
      makeNode({ id: 'A', action: 'create' }),
      makeNode({ id: 'B', action: 'create' }),
      makeNode({ id: 'C', action: 'skip' }),
    ]
    const output = renderPlanForLLM(makePlan(nodes))
    expect(output).toContain('2 operations')
  })

  it('mentions skipped nodes when present', () => {
    const nodes = [makeNode({ id: 'A', action: 'create' }), makeNode({ id: 'B', action: 'skip' })]
    const output = renderPlanForLLM(makePlan(nodes))
    expect(output).toContain('already built')
    expect(output).toContain('skipped')
  })

  it('does not mention skipped when all nodes are create', () => {
    const nodes = [makeNode({ id: 'A', action: 'create' })]
    const output = renderPlanForLLM(makePlan(nodes))
    expect(output).not.toContain('already built')
  })

  it('groups nodes by phase', () => {
    const nodes = [
      makeNode({
        id: 'app',
        phase: 'application',
        command: 'create-application',
        action: 'create',
        args: { 'application-name': 'MyApp' },
      }),
      makeNode({
        id: 'ent',
        phase: 'entity',
        command: 'averos-entity',
        action: 'create',
        args: { name: 'Task' },
      }),
    ]
    const output = renderPlanForLLM(makePlan(nodes))
    expect(output).toContain('Application')
    expect(output).toContain('Entities')
  })

  it('includes warning section when warnings exist', () => {
    const warnings = [
      {
        nodeId: 'entity:Task',
        type: 'UNSUPPORTED_UPDATE',
        message: 'Cannot update entity after creation',
      },
    ]
    const output = renderPlanForLLM(makePlan([makeNode()], warnings))
    expect(output).toContain('Warnings')
    expect(output).toContain('UNSUPPORTED_UPDATE')
  })

  it('does not include warning section when no warnings', () => {
    const output = renderPlanForLLM(makePlan([makeNode()]))
    expect(output).not.toContain('Warnings')
  })

  it('ends with approval prompt', () => {
    const output = renderPlanForLLM(makePlan([makeNode()]))
    expect(output).toContain('proceed')
  })

  it('extracts meaningful label from application-name arg', () => {
    const appNode = makeNode({
      phase: 'application',
      command: 'create-application',
      args: { 'application-name': 'ToDoApp', defaults: true },
    })
    const output = renderPlanForLLM(makePlan([appNode]))
    expect(output).toContain('ToDoApp')
  })

  it('extracts meaningful label from name arg', () => {
    const entityNode = makeNode({
      phase: 'entity',
      command: 'averos-entity',
      args: { name: 'ToDo', sname: 'ToDoService' },
    })
    const output = renderPlanForLLM(makePlan([entityNode]))
    expect(output).toContain('ToDo')
  })

  it('handles empty plan gracefully', () => {
    const output = renderPlanForLLM(makePlan([]))
    expect(output).toContain('0 operations')
    expect(output).not.toThrow
  })
})

describe('renderPlanSummaryForLLM', () => {
  it('returns comma-separated phase counts', () => {
    const nodes = [
      makeNode({ id: 'app', phase: 'application', action: 'create' }),
      makeNode({ id: 'e1', phase: 'entity', action: 'create' }),
      makeNode({ id: 'e2', phase: 'entity', action: 'create' }),
    ]
    const summary = renderPlanSummaryForLLM(makePlan(nodes))
    expect(summary).toContain('1 application')
    expect(summary).toContain('2 entities')
  })

  it('excludes skip nodes from summary', () => {
    const nodes = [
      makeNode({ id: 'A', phase: 'entity', action: 'create' }),
      makeNode({ id: 'B', phase: 'entity', action: 'skip' }),
    ]
    const summary = renderPlanSummaryForLLM(makePlan(nodes))
    expect(summary).toContain('1 entit')
    expect(summary).not.toContain('2')
  })
})
