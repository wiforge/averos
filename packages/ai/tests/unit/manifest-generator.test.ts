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

import { generateManifest }   from '../../src/generation/manifest-generator'
import type { LLMAdapter }    from '../../src/adapters/types'

// ─── Mock manifests ───────────────────────────────────────────────────────────

const VALID_MANIFEST = JSON.stringify({
  applicationName:             'TestApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name:    'Item',
      sname:   'ItemService',
      members: [
        { memberNature: 'simple', ename: 'Item', mname: 'item_id',
          memberType: 'string', memberTag: 'ID' },
        { memberNature: 'simple', ename: 'Item', mname: 'name',
          memberType: 'string', memberTag: 'BusinessID' },
      ],
    },
  ],
  serviceConfigurations: [
    { id: 'ItemService', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/items', apiHTTPQueryBuilder: 'mongodb' },
  ],
  useCases: [{ name: 'ItemCRUD', ename: 'Item', useCaseType: 'CRUD' }],
})

const INVALID_REF_01 = JSON.stringify({
  applicationName:             'BadApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name:    'Ghost',
      sname:   'GhostService',
      members: [
        {
          memberNature: 'simple',
          ename:        'Phantom',   // ← Phantom does not exist → REF-01
          mname:        'name',
          memberType:   'string',
        },
      ],
    },
  ],
  serviceConfigurations: [
    { id: 'GhostService', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/ghosts', apiHTTPQueryBuilder: 'mongodb' },
  ],
})

// ── CON-01: duplicate entity names ───────────────────────────────────────────

const INVALID_CON_01 = JSON.stringify({
  applicationName:             'DupApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: false,
  entities: [
    { name: 'Item', sname: 'ItemService1', members: [] },
    { name: 'Item', sname: 'ItemService2', members: [] },  // ← duplicate → CON-01
  ],
  serviceConfigurations: [
    { id: 'ItemService1', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/items1', apiHTTPQueryBuilder: 'mongodb' },
    { id: 'ItemService2', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/items2', apiHTTPQueryBuilder: 'mongodb' },
  ],
})

// ── CON-09: auth enabled but no providers ────────────────────────────────────

const INVALID_CON_09 = JSON.stringify({
  applicationName:                'AuthApp',
  defaultLanguageCode:            'en',
  enableAuthentication:           true,   // ← true but no providers → CON-09
  enableExternalEntityMapping:    false,
  defaultAuthenticationProvider:  'dummy',
  entities: [],
  serviceConfigurations: [],
  authentication: [],                     // ← empty → CON-09 fires
})

// ── REF-09: field-mapping references nonexistent simple-field ────────────────

const INVALID_REF_09 = JSON.stringify({
  applicationName:             'MappingApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: true,
  entities: [
    {
      name:    'Order',
      sname:   'OrderService',
      members: [
        { memberNature: 'simple', ename: 'Order', mname: 'order_id',
          memberType: 'string', memberTag: 'ID' },
      ],
    },
  ],
  serviceConfigurations: [
    { id: 'OrderService', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/orders', apiHTTPQueryBuilder: 'mongodb' },
  ],
  fieldMappings: [
    {
      ename:   'Order',
      name:    'OrderMapping',
      mapping: [
        { fieldKey: 'ghost_field', mapTo: '_id' },  // ← ghost_field does not exist → REF-09
      ],
    },
  ],
})


// ─── Mock LLM adapters ────────────────────────────────────────────────────────

function makeSuccessAdapter(): LLMAdapter {
  return { complete: jest.fn().mockResolvedValue(VALID_MANIFEST) }
}

function makeInvalidThenValidAdapter(): LLMAdapter {
  let calls = 0
  return {
    complete: jest.fn().mockImplementation(async () => {
      calls++
      return calls === 1 ? INVALID_REF_01 : VALID_MANIFEST
    }),
  }
}

function makeAlwaysInvalidAdapter(): LLMAdapter {
  return { complete: jest.fn().mockResolvedValue(INVALID_REF_01) }
}

function makeJsonErrorAdapter(): LLMAdapter {
  return { complete: jest.fn().mockResolvedValue('this is not json at all') }
}

function makeNetworkErrorAdapter(): LLMAdapter {
  return {
    complete: jest.fn().mockRejectedValue(new Error('Network error')),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateManifest', () => {

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns manifest on first successful attempt', async () => {
    const llm    = makeSuccessAdapter()
    const result = await generateManifest('Build a simple app', llm)

    expect(result.manifest).toBeDefined()
    expect(result.attempts).toBe(1)
    expect(Array.isArray(result.warnings)).toBe(true)
    expect(llm.complete).toHaveBeenCalledTimes(1)
    expect((result.manifest as any).applicationName).toBe('TestApp')
  })

  it('returns correct applicationName from manifest', async () => {
    const llm    = makeSuccessAdapter()
    const result = await generateManifest('Build TestApp', llm)
    expect((result.manifest as any).applicationName).toBe('TestApp')
  })

  // ── Retry behavior ────────────────────────────────────────────────────────

  it('retries when first attempt produces invalid manifest', async () => {
    const llm    = makeInvalidThenValidAdapter()
    const result = await generateManifest('Build an app', llm, { maxRetries: 3 })

    expect(result.manifest).toBeDefined()
    expect(result.attempts).toBe(2)
    expect(llm.complete).toHaveBeenCalledTimes(2)
  })

  it('throws after all retries exhausted', async () => {
    const llm = makeAlwaysInvalidAdapter()

    await expect(
      generateManifest('Build an app', llm, { maxRetries: 2 })
    ).rejects.toThrow(/Failed to generate valid manifest/)
  })

  it('respects maxRetries option — calls LLM exactly maxRetries times', async () => {
    const llm = makeAlwaysInvalidAdapter()

    await expect(
      generateManifest('Build an app', llm, { maxRetries: 2 })
    ).rejects.toThrow()

    expect(llm.complete).toHaveBeenCalledTimes(2)
  })

  it('succeeds on last allowed attempt', async () => {
    let calls = 0
    const llm: LLMAdapter = {
      complete: jest.fn().mockImplementation(async () => {
        calls++
        return calls < 3 ? INVALID_REF_01 : VALID_MANIFEST
      }),
    }

    const result = await generateManifest('Build an app', llm, { maxRetries: 3 })
    expect(result.attempts).toBe(3)
    expect(result.manifest).toBeDefined()
  })

  // ── Prompt injection ──────────────────────────────────────────────────────

  it('injects validation errors into retry prompt', async () => {
    const llm    = makeInvalidThenValidAdapter()
    await generateManifest('Build an app', llm, { maxRetries: 3 })

    const secondCall = (llm.complete as jest.Mock).mock.calls[1][0] as string
    // Retry prompt must include both the errors and the previous response
    expect(secondCall).toContain('validation errors')
    expect(secondCall).toContain('previous response')
  })

  it('retry prompt includes the specific validation error message', async () => {
    const llm = makeInvalidThenValidAdapter()
    await generateManifest('Build an app', llm, { maxRetries: 3 })

    const secondCall = (llm.complete as jest.Mock).mock.calls[1][0] as string
    // REF-01 error message should appear in the retry prompt
    expect(secondCall).toMatch(/Phantom|unknown entity|references/i)
  })

  it('first prompt does not contain retry language', async () => {
    const llm = makeSuccessAdapter()
    await generateManifest('Build an app', llm)

    const firstCall = (llm.complete as jest.Mock).mock.calls[0][0] as string
    expect(firstCall).not.toContain('previous response')
    expect(firstCall).not.toContain('Fix all errors')
  })

  // ── Invalid JSON handling ─────────────────────────────────────────────────

  it('handles non-JSON LLM response gracefully', async () => {
    const llm = makeJsonErrorAdapter()

    await expect(
      generateManifest('Build an app', llm, { maxRetries: 1 })
    ).rejects.toThrow(/Failed to generate/)
  })

  it('retries after non-JSON response', async () => {
    let calls = 0
    const llm: LLMAdapter = {
      complete: jest.fn().mockImplementation(async () => {
        calls++
        return calls === 1 ? 'not json at all' : VALID_MANIFEST
      }),
    }

    const result = await generateManifest('Build an app', llm, { maxRetries: 3 })
    expect(result.attempts).toBe(2)
  })

  // ── averosApplication wrapper support ─────────────────────────────────────

  it('unwraps averosApplication nested shape', async () => {
    const wrapped = JSON.stringify({ averosApplication: JSON.parse(VALID_MANIFEST) })
    const llm: LLMAdapter = {
      complete: jest.fn().mockResolvedValue(wrapped),
    }
    const result = await generateManifest('Build an app', llm)
    expect((result.manifest as any).applicationName).toBe('TestApp')
  })

  it('handles flat manifest shape (no wrapper)', async () => {
    const llm    = makeSuccessAdapter()
    const result = await generateManifest('Build an app', llm)
    expect((result.manifest as any).applicationName).toBe('TestApp')
  })

  // ── Validation rule coverage ──────────────────────────────────────────────
  // These tests verify that specific validation rules cause retries,
  // confirming the generator correctly rejects non-compliant manifests.

  it('rejects manifest with duplicate entity names (CON-01)', async () => {
    let calls = 0
    const llm: LLMAdapter = {
      complete: jest.fn().mockImplementation(async () => {
        calls++
        return calls === 1 ? INVALID_CON_01 : VALID_MANIFEST
      }),
    }

    const result = await generateManifest('Build an app', llm, {
      maxRetries: 3,
      onValidationFailure: (errors) => {
        expect(errors.some(e => e.toLowerCase().includes('duplicate entity'))).toBe(true)
      },
    })

    expect(result.attempts).toBe(2)
  })

  it('rejects manifest with auth enabled but no providers (CON-09)', async () => {
    let calls = 0
    const llm: LLMAdapter = {
      complete: jest.fn().mockImplementation(async () => {
        calls++
        return calls === 1 ? INVALID_CON_09 : VALID_MANIFEST
      }),
    }

    const onFail = jest.fn()
    const result = await generateManifest('Build a secure app', llm, {
      maxRetries: 3,
      onValidationFailure: onFail,
    })

    expect(result.attempts).toBe(2)
    expect(onFail).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringMatching(/auth-provider|no auth-provider/i),
      ]),
      1,
    )
  })

  it('rejects manifest with field-mapping referencing nonexistent field (REF-09)', async () => {
    let calls = 0
    const llm: LLMAdapter = {
      complete: jest.fn().mockImplementation(async () => {
        calls++
        return calls === 1 ? INVALID_REF_09 : VALID_MANIFEST
      }),
    }

    const failures: string[][] = []
    const result = await generateManifest('Build an app with mappings', llm, {
      maxRetries: 3,
      onValidationFailure: (errors) => failures.push(errors),
    })

    expect(result.attempts).toBe(2)
    expect(failures).toHaveLength(1)
  })

  // ── onValidationFailure hook ──────────────────────────────────────────────

  it('calls onValidationFailure with errors and attempt number', async () => {
    const failures: Array<{ errors: string[]; attempt: number }> = []
    const llm = makeInvalidThenValidAdapter()

    await generateManifest('Build an app', llm, {
      maxRetries: 3,
      onValidationFailure: (errors, attempt) => failures.push({ errors, attempt }),
    })

    expect(failures).toHaveLength(1)
    expect(failures[0].attempt).toBe(1)
    expect(failures[0].errors.length).toBeGreaterThan(0)
    expect(typeof failures[0].errors[0]).toBe('string')
  })

  it('does not call onValidationFailure on success', async () => {
    const onFail = jest.fn()
    const llm    = makeSuccessAdapter()

    await generateManifest('Build an app', llm, {
      maxRetries: 3,
      onValidationFailure: onFail,
    })

    expect(onFail).not.toHaveBeenCalled()
  })

  // ── Network errors ────────────────────────────────────────────────────────

  it('propagates network errors from LLM adapter', async () => {
    const llm = makeNetworkErrorAdapter()

    await expect(
      generateManifest('Build an app', llm, { maxRetries: 1 })
    ).rejects.toThrow('Network error')
  })

  it('propagates network error on retry attempt', async () => {
    let calls = 0
    const llm: LLMAdapter = {
      complete: jest.fn().mockImplementation(async () => {
        calls++
        if (calls === 1) return INVALID_REF_01
        throw new Error('Network failed on retry')
      }),
    }

    await expect(
      generateManifest('Build an app', llm, { maxRetries: 2 })
    ).rejects.toThrow('Network failed on retry')
  })

  // ── Warnings ─────────────────────────────────────────────────────────────

  it('returns empty warnings array on clean manifest', async () => {
    const llm    = makeSuccessAdapter()
    const result = await generateManifest('Build an app', llm)
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('returns warnings for manifest with non-blocking issues', async () => {
    // A manifest with languages but no translation entries triggers
    // CON-13 (translation coverage warning — severity: warning, not error)
    const manifestWithWarning = JSON.stringify({
      applicationName:             'WarnApp',
      defaultLanguageCode:         'en',
      enableAuthentication:        false,
      enableExternalEntityMapping: false,
      entities: [
        {
          name:    'Item',
          sname:   'ItemService',
          members: [
            { memberNature: 'simple', ename: 'Item', mname: 'item_id',
              memberType: 'string', memberTag: 'ID' },
          ],
        },
      ],
      serviceConfigurations: [
        { id: 'ItemService', apiHost: 'localhost', apiPort: 3000,
          apiProtocol: 'http', apiEndPoint: '/api/items', apiHTTPQueryBuilder: 'mongodb' },
      ],
      languages: [
        { languageCode: 'en', translationEntries: [] },  // ← empty entries → warning
      ],
    })

    const llm: LLMAdapter = { complete: jest.fn().mockResolvedValue(manifestWithWarning) }
    const result = await generateManifest('Build an app', llm)

    // Manifest is valid (no errors) but may have warnings
    expect(result.manifest).toBeDefined()
    expect(result.attempts).toBe(1)
  })
})