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

import { ConversationSession } from '../../src/conversation/session'
import type { LLMAdapter }     from '../../src/adapters/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_MANIFEST = {
  applicationName:             'TaskApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name:    'Task',
      sname:   'TaskService',
      members: [
        { memberNature: 'simple', ename: 'Task', mname: 'task_id',
          memberType: 'string', memberTag: 'ID' },
        { memberNature: 'simple', ename: 'Task', mname: 'title',
          memberType: 'string', memberTag: 'BusinessID' },
      ],
    },
  ],
  serviceConfigurations: [
    { id: 'TaskService', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/tasks', apiHTTPQueryBuilder: 'mongodb' },
  ],
  useCases: [{ name: 'TaskCRUD', ename: 'Task', useCaseType: 'CRUD' }],
}

const UPDATED_MANIFEST = {
  ...BASE_MANIFEST,
  entities: [
    {
      ...BASE_MANIFEST.entities[0],
      members: [
        ...BASE_MANIFEST.entities[0].members,
        { memberNature: 'simple', ename: 'Task', mname: 'priority',
          memberType: 'number' },
      ],
    },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAdapter(responses: object[]): LLMAdapter {
  let idx = 0
  return {
    complete: jest.fn().mockImplementation(async () => {
      const manifest = responses[Math.min(idx++, responses.length - 1)]
      return JSON.stringify(manifest)
    }),
  }
}

function makeAlwaysValidAdapter(manifest = BASE_MANIFEST): LLMAdapter {
  return { complete: jest.fn().mockResolvedValue(JSON.stringify(manifest)) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConversationSession', () => {

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts with null manifest', () => {
    const session = new ConversationSession(makeAlwaysValidAdapter())
    expect(session.currentManifest).toBeNull()
    expect(session.turnCount).toBe(0)
  })

  // ── First turn ────────────────────────────────────────────────────────────

  it('produces manifest on first turn', async () => {
    const session = new ConversationSession(makeAlwaysValidAdapter())
    const result  = await session.send('Build a task management app')

    expect(result.manifest).toBeDefined()
    expect(session.currentManifest).not.toBeNull()
    expect(session.turnCount).toBe(1)
  })

  it('returns correct applicationName from first turn', async () => {
    const session = new ConversationSession(makeAlwaysValidAdapter())
    const result  = await session.send('Build a task app')
    expect((result.manifest as any).applicationName).toBe('TaskApp')
  })

  it('increments turnCount on each send', async () => {
    const session = new ConversationSession(makeAlwaysValidAdapter())
    await session.send('First message')
    expect(session.turnCount).toBe(1)
    await session.send('Second message')
    expect(session.turnCount).toBe(2)
  })

  // ── Incremental updates ───────────────────────────────────────────────────

  it('updates manifest on second turn', async () => {
    const adapter = makeAdapter([BASE_MANIFEST, UPDATED_MANIFEST])
    const session = new ConversationSession(adapter)

    const first  = await session.send('Build a task app')
    const second = await session.send('Add a priority field to Task')

    const firstMembers  = (first.manifest as any).entities[0].members
    const secondMembers = (second.manifest as any).entities[0].members

    expect(secondMembers.length).toBeGreaterThan(firstMembers.length)
  })

  it('second turn prompt contains current manifest', async () => {
    const adapter = makeAdapter([BASE_MANIFEST, UPDATED_MANIFEST])
    const session = new ConversationSession(adapter)

    await session.send('Build a task app')
    await session.send('Add a priority field')

    const secondCallPrompt = (adapter.complete as jest.Mock).mock.calls[1][0] as string
    expect(secondCallPrompt).toContain('Current manifest')
    expect(secondCallPrompt).toContain('TaskApp')
  })

  it('second turn prompt contains user message', async () => {
    const adapter = makeAdapter([BASE_MANIFEST, UPDATED_MANIFEST])
    const session = new ConversationSession(adapter)

    await session.send('Build a task app')
    await session.send('Add a priority field')

    const secondCallPrompt = (adapter.complete as jest.Mock).mock.calls[1][0] as string
    expect(secondCallPrompt).toContain('Add a priority field')
  })

  it('first turn prompt does not include current manifest preamble', async () => {
    const adapter = makeAlwaysValidAdapter()
    const session = new ConversationSession(adapter)

    await session.send('Build a task app')

    const firstPrompt = (adapter.complete as jest.Mock).mock.calls[0][0] as string
    expect(firstPrompt).not.toContain('Current manifest')
  })

  // ── Reset ─────────────────────────────────────────────────────────────────

  it('reset clears manifest and turnCount', async () => {
    const session = new ConversationSession(makeAlwaysValidAdapter())
    await session.send('Build a task app')

    expect(session.currentManifest).not.toBeNull()
    expect(session.turnCount).toBe(1)

    session.reset()

    expect(session.currentManifest).toBeNull()
    expect(session.turnCount).toBe(0)
  })

  it('can start fresh after reset', async () => {
    const adapter = makeAlwaysValidAdapter()
    const session = new ConversationSession(adapter)

    await session.send('First build')
    session.reset()
    const result = await session.send('Second build')

    expect(result.manifest).toBeDefined()
    expect(session.turnCount).toBe(1)
  })

  // ── Return shape ──────────────────────────────────────────────────────────

  it('result includes attempts and warnings', async () => {
    const session = new ConversationSession(makeAlwaysValidAdapter())
    const result  = await session.send('Build an app')

    expect(typeof result.attempts).toBe('number')
    expect(result.attempts).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  // ── Error propagation ─────────────────────────────────────────────────────

  it('propagates LLM errors', async () => {
    const llm: LLMAdapter = {
      complete: jest.fn().mockRejectedValue(new Error('API timeout')),
    }
    const session = new ConversationSession(llm)

    await expect(session.send('Build an app')).rejects.toThrow('API timeout')
  })

  it('does not update currentManifest when generation fails', async () => {
    const llm: LLMAdapter = {
      complete: jest.fn().mockRejectedValue(new Error('API error')),
    }
    const session = new ConversationSession(llm)

    await session.send('Build a task app').catch(() => {})

    expect(session.currentManifest).toBeNull()
  })

  // ── currentManifest reflects latest turn ─────────────────────────────────

  it('currentManifest is updated after each successful turn', async () => {
    const adapter = makeAdapter([BASE_MANIFEST, UPDATED_MANIFEST])
    const session = new ConversationSession(adapter)

    await session.send('Build a task app')
    const after1 = session.currentManifest

    await session.send('Add priority field')
    const after2 = session.currentManifest

    const members1 = (after1 as any).entities[0].members.length
    const members2 = (after2 as any).entities[0].members.length
    expect(members2).toBeGreaterThan(members1)
  })

  // ── Multiple consecutive turns ─────────────────────────────────────────────

  it('handles three consecutive turns correctly', async () => {
    const manifests = [
      BASE_MANIFEST,
      UPDATED_MANIFEST,
      { ...UPDATED_MANIFEST, applicationName: 'FinalApp' },
    ]
    const adapter = makeAdapter(manifests)
    const session = new ConversationSession(adapter)

    await session.send('Turn 1')
    await session.send('Turn 2')
    await session.send('Turn 3')

    expect(session.turnCount).toBe(3)
    expect((session.currentManifest as any).applicationName).toBe('FinalApp')
  })
})