/**
 * @license
 * Copyright (c) 2026 Wiforge.
 *
 * Licensed under the MIT License.
 * See the LICENSE file in the project root for license information.
 */

// =============================================================================
// Converts a DAG engine ChangeSet into human-readable text for LLM presentation.
//
// Receives the authoritative ChangeSet from @averos/dag-engine — never
// recomputes diffs itself. Pure presentation layer.
// =============================================================================

import type { ChangeSet, DomainNode } from '@averos/dag-engine'

// =============================================================================
// Primary renderer
// =============================================================================

export function renderDiffForLLM(
  changeSet: ChangeSet,
  baseLabel: string,
  targetLabel: string,
): string {
  const totalChanges =
    changeSet.toAdd.size +
    changeSet.toUpdate.size +
    changeSet.conflicts.size +
    changeSet.toRemove.size

  if (totalChanges === 0) {
    return [
      `## ✅ No Differences`,
      ``,
      `**${baseLabel}** and **${targetLabel}** are semantically identical.`,
      `(${changeSet.unchanged.size} node(s) unchanged)`,
    ].join('\n')
  }

  const lines: string[] = [
    `## Manifest Diff`,
    ``,
    `Comparing **${baseLabel}** → **${targetLabel}**`,
    ``,
    buildChangeSummaryLine(changeSet),
    ``,
  ]

  // ── Nodes to add ──────────────────────────────────────────────────────────
  if (changeSet.toAdd.size > 0) {
    lines.push(`### ➕ Added (${changeSet.toAdd.size})`)
    lines.push(`*Present in target, not in base — will be created.*`)
    for (const [id, node] of changeSet.toAdd) {
      lines.push(`- \`${id}\` — ${formatNodeLabel(node)}`)
    }
    lines.push('')
  }

  // ── Nodes to update ───────────────────────────────────────────────────────
  if (changeSet.toUpdate.size > 0) {
    lines.push(`### ✏️ Updated (${changeSet.toUpdate.size})`)
    lines.push(`*Changed and supports update — will be re-applied.*`)
    for (const [id, node] of changeSet.toUpdate) {
      lines.push(`- \`${id}\` — ${formatNodeLabel(node)}`)
    }
    lines.push('')
  }

  // ── Conflicts ─────────────────────────────────────────────────────────────
  if (changeSet.conflicts.size > 0) {
    lines.push(`### ⚠️ Conflicts (${changeSet.conflicts.size})`)
    lines.push(`*Changed but cannot be updated — requires manual resolution.*`)
    for (const [id, node] of changeSet.conflicts) {
      lines.push(`- \`${id}\` — ${formatNodeLabel(node)}`)
    }
    lines.push('')
  }

  // ── Nodes to remove ───────────────────────────────────────────────────────
  if (changeSet.toRemove.size > 0) {
    lines.push(`### ➖ Removed (${changeSet.toRemove.size})`)
    lines.push(`*Present in base, not in target — informational only (not deleted).*`)
    for (const [id, node] of changeSet.toRemove) {
      lines.push(`- \`${id}\` — ${formatNodeLabel(node)}`)
    }
    lines.push('')
  }

  // ── Unchanged (summary only) ──────────────────────────────────────────────
  if (changeSet.unchanged.size > 0) {
    lines.push(`*${changeSet.unchanged.size} node(s) unchanged.*`)
    lines.push('')
  }

  // ── Conflict guidance ─────────────────────────────────────────────────────
  if (changeSet.conflicts.size > 0) {
    lines.push(`> **Note:** ${changeSet.conflicts.size} conflict(s) detected.`)
    lines.push(`> These nodes changed but do not support updates after creation.`)
    lines.push(`> You may need to resolve them manually or restructure the manifest.`)
    lines.push('')
  }

  return lines.join('\n')
}

// =============================================================================
// Helpers
// =============================================================================

function buildChangeSummaryLine(changeSet: ChangeSet): string {
  const parts: string[] = []

  if (changeSet.toAdd.size > 0) parts.push(`**${changeSet.toAdd.size}** added`)
  if (changeSet.toUpdate.size > 0) parts.push(`**${changeSet.toUpdate.size}** updated`)
  if (changeSet.conflicts.size > 0) parts.push(`**${changeSet.conflicts.size}** conflicted`)
  if (changeSet.toRemove.size > 0) parts.push(`**${changeSet.toRemove.size}** removed`)
  if (changeSet.unchanged.size > 0) parts.push(`${changeSet.unchanged.size} unchanged`)

  return parts.join(' · ')
}

function formatNodeLabel(node: DomainNode): string {
  // DomainNode has phase and a type-specific name field
  const phase = node.phase
  const name = extractNodeName(node)
  return name ? `${phase} — *${name}*` : phase
}

function extractNodeName(node: DomainNode): string | null {
  // Each DomainNode subtype has its own identity field
  // Cast to access common name-like fields across all subtypes
  const n = node as Record<string, unknown>

  return (
    (n['applicationName'] as string | undefined) ??
    (n['name'] as string | undefined) ??
    (n['ename'] as string | undefined) ??
    (n['mname'] as string | undefined) ??
    (n['id_'] as string | undefined) ??
    null
  )
}
