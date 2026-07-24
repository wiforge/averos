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
// Converts ExecutionPlan into human-readable text for LLM presentation.
//
// The LLM uses this text to explain the plan to the user in natural language.
// =============================================================================

import type { ExecutionPlan, ExecutionNode } from '@averos/dag-engine'

export function renderPlanForLLM(plan: ExecutionPlan): string {
  const actionable = plan.nodes.filter((n) => n.action !== 'skip')
  const skipped = plan.nodes.filter((n) => n.action === 'skip')

  const byPhase: Record<string, ExecutionNode[]> = {}
  for (const node of actionable) {
    if (!byPhase[node.phase]) byPhase[node.phase] = []
    byPhase[node.phase].push(node)
  }

  const lines: string[] = [
    `## Execution Plan`,
    ``,
    `**${actionable.length} operations** will be executed` +
      (skipped.length > 0 ? ` (${skipped.length} already built — will be skipped)` : '') +
      `.`,
    ``,
  ]

  // Group by phase for readability
  const phaseOrder = [
    'application',
    'entity',
    'simple-field',
    'composite-field',
    'mapping',
    'validator',
    'service-config',
    'use-case',
    'page',
    'auth',
    'translation',
    'translation-entry',
  ]

  for (const phase of phaseOrder) {
    const nodes = byPhase[phase]
    if (!nodes?.length) continue

    lines.push(`### ${formatPhaseLabel(phase)} (${nodes.length})`)
    for (const node of nodes) {
      const label = formatNodeLabel(node)
      lines.push(`- **${label}** \`${node.action}\``)
    }
    lines.push('')
  }

  if (plan.warnings.length > 0) {
    lines.push(`### ⚠ Warnings (${plan.warnings.length})`)
    for (const w of plan.warnings) {
      lines.push(`- [${w.type}] ${w.message}`)
    }
    lines.push('')
  }

  lines.push(`---`)
  lines.push(`Shall I proceed with execution?`)

  return lines.join('\n')
}

export function renderPlanSummaryForLLM(plan: ExecutionPlan): string {
  const actionable = plan.nodes.filter((n) => n.action !== 'skip')

  const counts: Record<string, number> = {}
  for (const node of actionable) {
    counts[node.phase] = (counts[node.phase] ?? 0) + 1
  }

  const parts = Object.entries(counts).map(
    ([phase, count]) => `${count} ${formatPhaseLabel(phase).toLowerCase()}`,
  )

  return parts.join(', ')
}

function formatPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    application: 'Application',
    entity: 'Entities',
    'simple-field': 'Fields',
    'composite-field': 'Relationships',
    mapping: 'Field Mappings',
    validator: 'Validators',
    'service-config': 'Service Configurations',
    'use-case': 'Use Cases',
    page: 'Pages',
    auth: 'Authentication',
    translation: 'Languages',
    'translation-entry': 'Translations',
  }
  return labels[phase] ?? phase
}

function formatNodeLabel(node: ExecutionNode): string {
  const args = node.args as Record<string, unknown>

  // Extract the most meaningful identifier from args
  const name =
    args['application-name'] ??
    args['name'] ??
    args['ename'] ??
    args['lang'] ??
    args['key'] ??
    node.id

  return String(name)
}
