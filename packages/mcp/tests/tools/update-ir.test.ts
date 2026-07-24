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
// tests/tools/update-ir.test.ts
// =============================================================================

import { SessionManager } from '../../src/session/manager'
import { InMemorySessionStore } from '../../src/session/store/memory'
import { updateIr } from '../../src/tools/update-ir'
import { isOk, isFail } from '../../src/tools/types'

function makeManager() {
  return new SessionManager(new InMemorySessionStore())
}

async function createSession(manager: SessionManager) {
  return manager.create('/workspace/test')
}

describe('updateIr', () => {
  // ── SESSION_NOT_FOUND ─────────────────────────────────────────────────────

  it('returns SESSION_NOT_FOUND for unknown session', async () => {
    const manager = makeManager()
    const result = await updateIr(
      { sessionId: 'nonexistent', patch: [{ op: 'add', path: '/applicationName', value: 'X' }] },
      manager,
    )
    expect(isFail(result)).toBe(true)
    if (isFail(result)) {
      expect(result.code).toBe('SESSION_NOT_FOUND')
    }
  })

  // ── op: add ───────────────────────────────────────────────────────────────

  it('adds a top-level field', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/applicationName', value: 'ToDoApp' }],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.data.manifest as any).applicationName).toBe('ToDoApp')
      expect(result.data.revision).toBe(1)
      expect(result.data.patchedPaths).toContain('/applicationName')
    }
  })

  it('adds a nested field via JSON Pointer', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    // First set up the base structure
    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [
          {
            op: 'add',
            path: '',
            value: {
              applicationName: 'App',
              entities: [{ name: 'ToDo', sname: 'ToDoService', members: [] }],
            },
          },
        ],
      },
      manager,
    )

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/entities/0/description', value: 'Task entity' }],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.data.manifest as any).entities[0].description).toBe('Task entity')
    }
  })

  // ── op: replace ───────────────────────────────────────────────────────────

  it('replaces an existing field', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/applicationName', value: 'OldName' }],
      },
      manager,
    )

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'replace', path: '/applicationName', value: 'NewName' }],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.data.manifest as any).applicationName).toBe('NewName')
    }
  })

  it('returns PATCH_FAILED when replacing nonexistent path', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'replace', path: '/nonexistent', value: 'x' }],
      },
      manager,
    )

    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('PATCH_FAILED')
  })

  // ── op: remove ────────────────────────────────────────────────────────────

  it('removes a field', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [
          { op: 'add', path: '/applicationName', value: 'App' },
          { op: 'add', path: '/description', value: 'to remove' },
        ],
      },
      manager,
    )

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'remove', path: '/description' }],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.data.manifest as any).description).toBeUndefined()
    }
  })

  // ── op: test ─────────────────────────────────────────────────────────────

  it('test op passes when value matches', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/applicationName', value: 'App' }],
      },
      manager,
    )

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [
          { op: 'test', path: '/applicationName', value: 'App' },
          { op: 'replace', path: '/applicationName', value: 'NewApp' },
        ],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
  })

  it('test op fails and returns PATCH_FAILED when value does not match', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/applicationName', value: 'App' }],
      },
      manager,
    )

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'test', path: '/applicationName', value: 'WrongName' }],
      },
      manager,
    )

    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('PATCH_FAILED')
  })

  // ── op: move ─────────────────────────────────────────────────────────────

  it('moves a field', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/oldKey', value: 'moved-value' }],
      },
      manager,
    )

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'move', from: '/oldKey', path: '/newKey' }],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.data.manifest as any).newKey).toBe('moved-value')
      expect((result.data.manifest as any).oldKey).toBeUndefined()
    }
  })

  // ── Full manifest replacement ─────────────────────────────────────────────

  it('replaces entire manifest when path is empty', async () => {
    const manager = makeManager()
    const session = await createSession(manager)
    const manifest = { applicationName: 'Fresh', defaultLanguageCode: 'en' }

    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '', value: manifest }],
      },
      manager,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.data.manifest as any).applicationName).toBe('Fresh')
    }
  })

  // ── Revision increments ───────────────────────────────────────────────────

  it('increments revision on each successful patch', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    const r1 = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/a', value: 1 }],
      },
      manager,
    )

    const r2 = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/b', value: 2 }],
      },
      manager,
    )

    expect(isOk(r1) && r1.data.revision).toBe(1)
    expect(isOk(r2) && r2.data.revision).toBe(2)
  })

  it('does not increment revision on failed patch', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/a', value: 1 }],
      },
      manager,
    )

    const failResult = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'replace', path: '/nonexistent', value: 'x' }],
      },
      manager,
    )

    expect(isFail(failResult)).toBe(true)

    const loaded = await manager.load(session.metadata.id)
    expect(loaded.design.revision).toBe(1) // unchanged
  })

  // ── Comment stored in revision ────────────────────────────────────────────

  it('stores comment in revision history', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/a', value: 1 }],
        comment: 'initial setup',
      },
      manager,
    )

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/b', value: 2 }],
        comment: 'added field b',
      },
      manager,
    )

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/c', value: 2 }],
        comment: 'added field c',
      },
      manager,
    )

    const loaded = await manager.load(session.metadata.id)

    // history[0] = the revision-1 manifest that was replaced by revision-2
    // history[1] = the revision-2 manifest that was replaced by revision-3

    expect(loaded.design.history).toHaveLength(2)
    expect(loaded.design.history[0].comment).toBe('added field b')
    expect(loaded.design.history[1].comment).toBe('added field c')
  })

  // ── Atomicity ─────────────────────────────────────────────────────────────

  it('does not partially apply patch on failure — manifest unchanged', async () => {
    const manager = makeManager()
    const session = await createSession(manager)

    await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [{ op: 'add', path: '/applicationName', value: 'Original' }],
      },
      manager,
    )

    // Second op in the patch will fail — first op must be rolled back
    const result = await updateIr(
      {
        sessionId: session.metadata.id,
        patch: [
          { op: 'add', path: '/newField', value: 'added' },
          { op: 'replace', path: '/nonexistent', value: 'fail' },
        ],
      },
      manager,
    )

    expect(isFail(result)).toBe(true)

    const loaded = await manager.load(session.metadata.id)
    expect((loaded.design.manifest as any).newField).toBeUndefined()
    expect((loaded.design.manifest as any).applicationName).toBe('Original')
  })
})
