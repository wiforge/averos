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
// tests/session/store/memory.test.ts
// =============================================================================

import { InMemorySessionStore } from '../../../src/session/store/memory'
import { createSessionState } from '../../../src/session/types'

function makeSession(workspaceDir = '/workspace/test') {
  return createSessionState(workspaceDir)
}

describe('InMemorySessionStore', () => {
  let store: InMemorySessionStore

  beforeEach(() => {
    store = new InMemorySessionStore()
  })

  // ── load ─────────────────────────────────────────────────────────────────

  it('returns null for unknown session', async () => {
    expect(await store.load('nonexistent')).toBeNull()
  })

  // ── save + load ───────────────────────────────────────────────────────────

  it('saves and loads a session', async () => {
    const session = makeSession()
    await store.save(session)
    const loaded = await store.load(session.metadata.id)
    expect(loaded).not.toBeNull()
    expect(loaded!.metadata.id).toBe(session.metadata.id)
  })

  // ── immutability ─────────────────────────────────────────────────────────

  it('load returns a deep copy — mutation does not affect store', async () => {
    const session = makeSession()
    await store.save(session)
    const loaded = await store.load(session.metadata.id)
    loaded!.metadata.workspaceDir = 'mutated'
    const reloaded = await store.load(session.metadata.id)
    expect(reloaded!.metadata.workspaceDir).toBe('/workspace/test')
  })

  it('save stores a deep copy — mutation after save does not affect store', async () => {
    const session = makeSession()
    await store.save(session)
    session.metadata.workspaceDir = 'mutated-after-save'
    const loaded = await store.load(session.metadata.id)
    expect(loaded!.metadata.workspaceDir).toBe('/workspace/test')
  })

  // ── overwrite ─────────────────────────────────────────────────────────────

  it('overwrites session on second save', async () => {
    const session = makeSession()
    await store.save(session)
    const updated = { ...session, metadata: { ...session.metadata, workspaceDir: '/new/dir' } }
    await store.save(updated)
    const loaded = await store.load(session.metadata.id)
    expect(loaded!.metadata.workspaceDir).toBe('/new/dir')
  })

  // ── delete ────────────────────────────────────────────────────────────────

  it('deletes a session', async () => {
    const session = makeSession()
    await store.save(session)
    await store.delete(session.metadata.id)
    expect(await store.load(session.metadata.id)).toBeNull()
  })

  it('delete is a no-op for missing session', async () => {
    await expect(store.delete('nonexistent')).resolves.not.toThrow()
  })

  // ── list ──────────────────────────────────────────────────────────────────

  it('lists all session IDs', async () => {
    const s1 = makeSession('/w1')
    const s2 = makeSession('/w2')
    await store.save(s1)
    await store.save(s2)
    const ids = await store.list()
    expect(ids).toContain(s1.metadata.id)
    expect(ids).toContain(s2.metadata.id)
    expect(ids).toHaveLength(2)
  })

  it('list returns empty array when no sessions', async () => {
    expect(await store.list()).toHaveLength(0)
  })
})
