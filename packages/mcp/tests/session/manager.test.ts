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
// tests/session/manager.test.ts
// =============================================================================

import { Manifest } from '@averos/dag-engine'
import { SessionManager, SessionNotFoundError } from '../../src/session/manager'
import { InMemorySessionStore } from '../../src/session/store/memory'
import { MAX_HISTORY_SIZE } from '../../src/session/types'

function makeManager() {
  return new SessionManager(new InMemorySessionStore())
}

const MINIMAL_MANIFEST: Manifest = {
  applicationName: 'TestApp',
  defaultLanguageCode: 'en',
  enableAuthentication: false,
  enableExternalEntityMapping: false,
} as unknown as Manifest

describe('SessionManager', () => {
  // ── create ────────────────────────────────────────────────────────────────

  it('creates a session with correct defaults', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    expect(session.metadata.workspaceDir).toBe('/workspace')
    expect(session.metadata.config.mode).toBe('resilient')
    expect(session.design.manifest).toBeNull()
    expect(session.design.revision).toBe(0)
    expect(session.planning.plan).toBeNull()
    expect(session.planning.approval).toBe('not_required')
    expect(session.execution.phase).toBe('not_started')
  })

  it('creates a session with custom config', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace', { mode: 'strict', dryRun: true })
    expect(session.metadata.config.mode).toBe('strict')
    expect(session.metadata.config.dryRun).toBe(true)
  })

  it('assigns unique IDs to different sessions', async () => {
    const manager = makeManager()
    const s1 = await manager.create('/w1')
    const s2 = await manager.create('/w2')
    expect(s1.metadata.id).not.toBe(s2.metadata.id)
  })

  // ── load ─────────────────────────────────────────────────────────────────

  it('throws SessionNotFoundError for unknown id', async () => {
    const manager = makeManager()
    await expect(manager.load('nonexistent')).rejects.toThrow(SessionNotFoundError)
    await expect(manager.load('nonexistent')).rejects.toThrow('nonexistent')
  })

  it('tryLoad returns null for unknown id', async () => {
    const manager = makeManager()
    expect(await manager.tryLoad('nonexistent')).toBeNull()
  })

  // ── setManifest ───────────────────────────────────────────────────────────

  it('increments revision on setManifest', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    expect(session.design.revision).toBe(0)
    const updated = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect(updated.design.revision).toBe(1)
    const updated2 = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect(updated2.design.revision).toBe(2)
  })

  it('stores manifest correctly', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const updated = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect((updated.design.manifest as any).applicationName).toBe('TestApp')
  })

  it('records previous manifest in history on update', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const first = { ...MINIMAL_MANIFEST, applicationName: 'FirstApp' } as any
    const second = { ...MINIMAL_MANIFEST, applicationName: 'SecondApp' } as any
    await manager.setManifest(session.metadata.id, first)
    const after2 = await manager.setManifest(session.metadata.id, second)
    expect(after2.design.history).toHaveLength(1)
    expect((after2.design.history[0].manifest as any).applicationName).toBe('FirstApp')
  })

  it('does not add to history when manifest was null (first set)', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const updated = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect(updated.design.history).toHaveLength(0)
  })

  it('invalidates validationResult on manifest change', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.patchDesign(session.metadata.id, {
      validationResult: { valid: true, errors: [] },
    })
    const updated = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect(updated.design.validationResult).toBeNull()
  })

  it('invalidates plan on manifest change', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.patchPlanning(session.metadata.id, {
      plan: {} as any,
      manifestRevisionAtPlan: 0,
      approval: 'approved',
    })
    const updated = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect(updated.planning.plan).toBeNull()
    expect(updated.planning.approval).toBe('not_required')
    expect(updated.planning.manifestRevisionAtPlan).toBeNull()
  })

  it('caps history at MAX_HISTORY_SIZE', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')

    // Set manifest MAX_HISTORY_SIZE + 5 times
    let current = session
    for (let i = 0; i <= MAX_HISTORY_SIZE + 4; i++) {
      current = await manager.setManifest(session.metadata.id, {
        ...MINIMAL_MANIFEST,
        applicationName: `App${i}`,
      } as any)
    }

    expect(current.design.history.length).toBeLessThanOrEqual(MAX_HISTORY_SIZE)
  })

  it('stores comment in history entry', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    const updated = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST, 'Added auth')
    expect(updated.design.history[0].comment).toBe('Added auth')
  })

  // ── patchDesign / patchPlanning / patchExecution ──────────────────────────

  it('patchDesign only touches design domain', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const before = session.planning.plan
    await manager.patchDesign(session.metadata.id, {
      validationResult: { valid: true, errors: [] },
    })
    const after = await manager.load(session.metadata.id)
    expect(after.design.validationResult?.valid).toBe(true)
    expect(after.planning.plan).toBe(before)
  })

  it('patchExecution only touches execution domain', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.patchExecution(session.metadata.id, { phase: 'running' })
    const after = await manager.load(session.metadata.id)
    expect(after.execution.phase).toBe('running')
    expect(after.design.manifest).toBeNull() // untouched
  })

  // ── updatedAt ─────────────────────────────────────────────────────────────

  it('updates updatedAt on every patch', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const before = session.metadata.updatedAt

    await new Promise((r) => setTimeout(r, 5))

    const after = await manager.setManifest(session.metadata.id, MINIMAL_MANIFEST)
    expect(after.metadata.updatedAt).not.toBe(before)
  })
})
