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
// tests/tools/build-plan.test.ts
// =============================================================================

import { SessionManager } from '../../src/session/manager'
import { InMemorySessionStore } from '../../src/session/store/memory'
import { validateIr } from '../../src/tools/validate-ir'
import { buildPlan } from '../../src/tools/build-plan'
import { isOk, isFail } from '../../src/tools/types'
import { Manifest } from '@averos/dag-engine'

// We mock FileStateStore to avoid reading from disk in unit tests
jest.mock('@averos/executor', () => ({
  ...jest.requireActual('@averos/executor'),
  FileStateStore: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(null),
  })),
}))

function makeManager() {
  return new SessionManager(new InMemorySessionStore())
}

const VALID_MANIFEST = {
  applicationName: 'PlanTestApp',
  defaultLanguageCode: 'en',
  enableAuthentication: false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name: 'Task',
      sname: 'TaskService',
      members: [
        {
          memberNature: 'simple',
          ename: 'Task',
          mname: 'task_id',
          memberType: 'string',
          memberTag: 'ID',
        },
        {
          memberNature: 'simple',
          ename: 'Task',
          mname: 'title',
          memberType: 'string',
          memberTag: 'BusinessID',
        },
      ],
    },
  ],
  serviceConfigurations: [
    {
      id: 'TaskService',
      apiHost: 'localhost',
      apiPort: 3000,
      apiProtocol: 'http',
      apiEndPoint: '/api/tasks',
      apiHTTPQueryBuilder: 'mongodb',
    },
  ],
  useCases: [{ name: 'TaskCRUD', ename: 'Task', useCaseType: 'CRUD' }],
} as unknown as Manifest

async function makeValidatedSession(manager: SessionManager) {
  const session = await manager.create('/workspace/plan-test')
  await manager.setManifest(session.metadata.id, VALID_MANIFEST)
  await validateIr({ sessionId: session.metadata.id }, manager)
  return manager.load(session.metadata.id)
}

describe('buildPlan', () => {
  // ── SESSION_NOT_FOUND ─────────────────────────────────────────────────────

  it('returns SESSION_NOT_FOUND for unknown session', async () => {
    const manager = makeManager()
    const result = await buildPlan({ sessionId: 'nonexistent' }, manager)
    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('SESSION_NOT_FOUND')
  })

  // ── NOT_VALIDATED ─────────────────────────────────────────────────────────

  it('returns NOT_VALIDATED when manifest has not been validated', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, VALID_MANIFEST)
    // No validateIr call
    const result = await buildPlan({ sessionId: session.metadata.id }, manager)
    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('NOT_VALIDATED')
  })

  it('returns NOT_VALIDATED when session has no manifest at all', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const result = await buildPlan({ sessionId: session.metadata.id }, manager)
    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('NOT_VALIDATED')
  })

  // ── Success ───────────────────────────────────────────────────────────────

  it('returns ok with plan for validated session', async () => {
    const manager = makeManager()
    const session = await makeValidatedSession(manager)
    const result = await buildPlan({ sessionId: session.metadata.id }, manager)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data.plan).toBeDefined()
      expect(result.data.nodeCount).toBeGreaterThan(0)
      expect(result.data.actionCount).toBeGreaterThan(0)
      expect(result.data.display).toBeTruthy()
    }
  })

  it('stores plan in session with correct revision stamp', async () => {
    const manager = makeManager()
    const session = await makeValidatedSession(manager)
    await buildPlan({ sessionId: session.metadata.id }, manager)

    const loaded = await manager.load(session.metadata.id)
    expect(loaded.planning.plan).not.toBeNull()
    expect(loaded.planning.manifestRevisionAtPlan).toBe(session.design.revision)
    expect(loaded.planning.approval).toBe('pending')
    expect(loaded.planning.planCreatedAt).toBeTruthy()
  })

  it('plan has application node first', async () => {
    const manager = makeManager()
    const session = await makeValidatedSession(manager)
    const result = await buildPlan({ sessionId: session.metadata.id }, manager)

    if (isOk(result)) {
      expect(result.data.plan.nodes[0].phase).toBe('application')
    }
  })

  it('all plan nodes have required fields', async () => {
    const manager = makeManager()
    const session = await makeValidatedSession(manager)
    const result = await buildPlan({ sessionId: session.metadata.id }, manager)

    if (isOk(result)) {
      for (const node of result.data.plan.nodes) {
        expect(node.id).toBeTruthy()
        expect(node.command).toBeTruthy()
        expect(node.runner).toBeTruthy()
        expect(['create', 'update', 'skip']).toContain(node.action)
      }
    }
  })

  it('display contains operation count', async () => {
    const manager = makeManager()
    const session = await makeValidatedSession(manager)
    const result = await buildPlan({ sessionId: session.metadata.id }, manager)

    if (isOk(result)) {
      expect(result.data.display).toContain('Execution Plan')
    }
  })

  // ── Plan staleness after manifest change ──────────────────────────────────

  it('plan becomes stale after manifest update', async () => {
    const manager = makeManager()
    const session = await makeValidatedSession(manager)
    await buildPlan({ sessionId: session.metadata.id }, manager)

    // Update the manifest — this increments revision
    await manager.setManifest(session.metadata.id, {
      ...VALID_MANIFEST,
      applicationName: 'Updated',
    } as Manifest)

    const loaded = await manager.load(session.metadata.id)
    // Plan was cleared by setManifest
    expect(loaded.planning.plan).toBeNull()
    expect(loaded.planning.manifestRevisionAtPlan).toBeNull()
  })
})
