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
// tests/tools/validate-ir.test.ts
// =============================================================================

import { SessionManager } from '../../src/session/manager'
import { InMemorySessionStore } from '../../src/session/store/memory'
import { validateIr } from '../../src/tools/validate-ir'
import { isOk, isFail } from '../../src/tools/types'
import { Manifest } from '@averos/dag-engine'

function makeManager() {
  return new SessionManager(new InMemorySessionStore())
}

const VALID_MANIFEST = {
  applicationName: 'TestApp',
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
}

// REF-01: field references nonexistent entity
const INVALID_MANIFEST = {
  applicationName: 'BadApp',
  defaultLanguageCode: 'en',
  enableAuthentication: false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name: 'Ghost',
      sname: 'GhostService',
      members: [{ memberNature: 'simple', ename: 'Phantom', mname: 'name', memberType: 'string' }],
    },
  ],
  serviceConfigurations: [
    {
      id: 'GhostService',
      apiHost: 'localhost',
      apiPort: 3000,
      apiProtocol: 'http',
      apiEndPoint: '/api/ghosts',
      apiHTTPQueryBuilder: 'mongodb',
    },
  ],
}

describe('validateIr', () => {
  // ── SESSION_NOT_FOUND ─────────────────────────────────────────────────────

  it('returns SESSION_NOT_FOUND for unknown session', async () => {
    const manager = makeManager()
    const result = await validateIr({ sessionId: 'nonexistent' }, manager)
    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('SESSION_NOT_FOUND')
  })

  // ── NO_MANIFEST ───────────────────────────────────────────────────────────

  it('returns NO_MANIFEST when session has no manifest', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    const result = await validateIr({ sessionId: session.metadata.id }, manager)
    expect(isFail(result)).toBe(true)
    if (isFail(result)) expect(result.code).toBe('NO_MANIFEST')
  })

  // ── Valid manifest ────────────────────────────────────────────────────────

  it('returns ok with valid=true for a valid manifest', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, VALID_MANIFEST as unknown as Manifest)

    const result = await validateIr({ sessionId: session.metadata.id }, manager)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.data.valid).toBe(true)
      expect(result.data.errorCount).toBe(0)
      expect(result.data.nodeCount).toBeGreaterThan(0)
    }
  })

  it('stores validationResult in session after success', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, VALID_MANIFEST as unknown as Manifest)
    await validateIr({ sessionId: session.metadata.id }, manager)

    const loaded = await manager.load(session.metadata.id)
    expect(loaded.design.validationResult?.valid).toBe(true)
  })

  // ── Invalid manifest ──────────────────────────────────────────────────────

  it('returns ok with valid=false for invalid manifest', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, INVALID_MANIFEST as unknown as Manifest)

    const result = await validateIr({ sessionId: session.metadata.id }, manager)

    expect(isOk(result)).toBe(true) // tool succeeds, data.valid is false
    if (isOk(result)) {
      expect(result.data.valid).toBe(false)
      expect(result.data.errorCount).toBeGreaterThan(0)
      expect(result.data.display).toContain('Validation Failed')
    }
  })

  it('invalidates plan when validation result changes', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')

    // Fake a plan that was previously built
    await manager.patchPlanning(session.metadata.id, {
      plan: {} as any,
      manifestRevisionAtPlan: 0,
      approval: 'approved',
    })

    await manager.setManifest(session.metadata.id, INVALID_MANIFEST as unknown as Manifest)
    await validateIr({ sessionId: session.metadata.id }, manager)

    const loaded = await manager.load(session.metadata.id)
    expect(loaded.planning.plan).toBeNull()
  })

  it('includes error details in result', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, INVALID_MANIFEST as unknown as Manifest)

    const result = await validateIr({ sessionId: session.metadata.id }, manager)
    if (isOk(result)) {
      expect(result.data.errors.some((e) => e.severity === 'error')).toBe(true)
      expect(result.data.errors[0].message).toBeTruthy()
    }
  })

  // ── display text ─────────────────────────────────────────────────────────

  it('display contains success message for valid manifest', async () => {
    const manager = makeManager()
    const session = await manager.create('/workspace')
    await manager.setManifest(session.metadata.id, VALID_MANIFEST as unknown as Manifest)

    const result = await validateIr({ sessionId: session.metadata.id }, manager)
    if (isOk(result)) {
      expect(result.data.display).toContain('✅')
      expect(result.data.display).toContain('build_execution_plan')
    }
  })
})
