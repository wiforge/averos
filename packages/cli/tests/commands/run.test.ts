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

// Mock output utilities — prevent spinner/logger output from polluting
// process.stdout.write captures and breaking JSON.parse assertions.
// The spinner is silent in non-TTY anyway (Jest runs without a TTY),
// but mocking makes the isolation explicit and future-proof.

jest.mock('../../src/output/spinner', () => ({
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    update: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    clear: jest.fn(),
    get isSpinning() {
      return false
    },
  })),
}))

jest.mock('../../src/output/live-logger', () => ({
  LiveLogger: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    debug: jest.fn(),
    onEvent: jest.fn(),
    elapsed: jest.fn().mockReturnValue('0ms'),
  })),
}))

// Mock workspace bootstrap — prevents real npm install during tests
jest.mock('../../src/infra/workspace-bootstrap', () => ({
  bootstrapWorkspace: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/output/node-logger', () => ({
  NodeLogger: jest.fn().mockImplementation(() => ({
    asListener: jest.fn().mockReturnValue({ onEvent: jest.fn() }),
    flush: jest.fn(),
  })),
}))

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// ─── Mock @averos/executor ────────────────────────────────────────────────────────
// The run command uses the real orchestrate pipeline but a mock adapter.
// We mock the entire @averos/executor module to avoid spawning real real Angular schematics processes.

const mockSummary = {
  total: 5,
  succeeded: 5,
  failed: 0,
  skipped: 0,
  cancelled: 0,
  durationMs: 100,
  mode: 'resilient' as const,
  success: true,
  failures: [],
}

jest.mock('@averos/executor', () => ({
  orchestrateAndExecuteManifest: jest.fn().mockResolvedValue(mockSummary),
  AngularSchematicsAdapter: jest.fn().mockImplementation(() => ({})),
  FileCheckpointStore: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(new Map()),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
  FileStateStore: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
  createLegacyListener: jest.fn().mockReturnValue({ onEvent: jest.fn() }),
}))

import { runCommand } from '../../src/commands/run'
import type { RunArgs } from '../../src/args/types'
import type { AverosConfig } from '../../src/config/types'
import { orchestrateAndExecuteManifest } from '@averos/executor'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_MANIFEST = {
  applicationName: 'RunTestApp',
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
const MANIFEST_REF_01 = {
  ...VALID_MANIFEST,
  applicationName: 'BadApp',
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
  useCases: [],
}

// CON-01: duplicate entity names
const MANIFEST_CON_01 = {
  ...VALID_MANIFEST,
  applicationName: 'DupApp',
  entities: [
    { name: 'Item', sname: 'ItemService1', members: [] },
    { name: 'Item', sname: 'ItemService2', members: [] },
  ],
  serviceConfigurations: [
    {
      id: 'ItemService1',
      apiHost: 'localhost',
      apiPort: 3000,
      apiProtocol: 'http',
      apiEndPoint: '/api/a',
      apiHTTPQueryBuilder: 'mongodb',
    },
    {
      id: 'ItemService2',
      apiHost: 'localhost',
      apiPort: 3000,
      apiProtocol: 'http',
      apiEndPoint: '/api/b',
      apiHTTPQueryBuilder: 'mongodb',
    },
  ],
  useCases: [],
}

// CON-09: auth enabled but no providers
const MANIFEST_CON_09 = {
  applicationName: 'AuthApp',
  defaultLanguageCode: 'en',
  enableAuthentication: true,
  enableExternalEntityMapping: false,
  defaultAuthenticationProvider: 'dummy',
  entities: [],
  serviceConfigurations: [],
  authentication: [],
}

// REF-09: field-mapping references nonexistent simple-field
const MANIFEST_REF_09 = {
  ...VALID_MANIFEST,
  applicationName: 'MappingApp',
  enableExternalEntityMapping: true,
  fieldMappings: [
    {
      ename: 'Task',
      name: 'TaskMapping',
      mapping: [{ fieldKey: 'ghost_field', mapTo: '_id' }],
    },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'averos-run-test-'))
}

function writeManifest(dir: string, manifest: object): string {
  const p = path.join(dir, 'averos-app.json')
  fs.writeFileSync(p, JSON.stringify(manifest), 'utf-8')
  return p
}

function makeArgs(
  manifestPath: string,
  workspaceRoot: string,
  overrides: Partial<RunArgs> = {},
): RunArgs {
  return {
    command: 'run',
    workspaceRoot,
    configPath: 'averos.config.json',
    verbose: false,
    manifestPath,
    mode: 'resilient',
    dryRun: false,
    resume: false,
    timeoutMs: undefined,
    maxAttempts: 1,
    ...overrides,
  }
}

function getStdout(spy: jest.SpyInstance): string {
  return spy.mock.calls.map((c: unknown[]) => String(c[0])).join('')
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runCommand', () => {
  let tmpDir: string
  let stdoutSpy: jest.SpyInstance
  let stderrSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    tmpDir = makeTmpDir()
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
    ;(orchestrateAndExecuteManifest as jest.Mock).mockResolvedValue(mockSummary)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    // also suppress warn:
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    stdoutSpy.mockRestore()
    stderrSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    jest.restoreAllMocks()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  // ── Exit codes ────────────────────────────────────────────────────────────

  it('exits 0 on successful execution', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    const code = await runCommand(makeArgs(manifestPath, tmpDir), {})
    expect(code).toBe(0)
  })

  it('exits 1 when manifest file is missing', async () => {
    const args = makeArgs(path.join(tmpDir, 'ghost.json'), tmpDir)
    const code = await runCommand(args, {})
    expect(code).toBe(1)
    expect(orchestrateAndExecuteManifest).not.toHaveBeenCalled()
  })

  it('exits 1 when manifest fails validation', async () => {
    const manifestPath = writeManifest(tmpDir, MANIFEST_REF_01)
    const code = await runCommand(makeArgs(manifestPath, tmpDir), {})
    expect(code).toBe(1)
    expect(orchestrateAndExecuteManifest).not.toHaveBeenCalled()
  })

  it('exits 1 when execution fails', async () => {
    ;(orchestrateAndExecuteManifest as jest.Mock).mockResolvedValue({
      ...mockSummary,
      success: false,
      failed: 1,
      failures: [
        {
          nodeId: 'entity:Task',
          message: 'ng not found',
          failedAt: new Date().toISOString(),
        },
      ],
    })
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    const code = await runCommand(makeArgs(manifestPath, tmpDir), {})
    expect(code).toBe(1)
  })

  // ── Validation rule enforcement ───────────────────────────────────────────
  // Each test below verifies that the validation rule fires, blocks execution
  // (orchestrateAndExecuteManifest is NOT called), and exits with code 1.

  it('REF-01: rejects manifest where field ename references nonexistent entity', async () => {
    const code = await runCommand(makeArgs(writeManifest(tmpDir, MANIFEST_REF_01), tmpDir), {})
    expect(code).toBe(1)
    expect(orchestrateAndExecuteManifest).not.toHaveBeenCalled()

    // Confirm the error message mentions the broken reference
    const errOutput = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(errOutput).toMatch(/validation failed/i)
  })

  it('CON-01: rejects manifest with duplicate entity names', async () => {
    const code = await runCommand(makeArgs(writeManifest(tmpDir, MANIFEST_CON_01), tmpDir), {})
    expect(code).toBe(1)
    expect(orchestrateAndExecuteManifest).not.toHaveBeenCalled()

    const errOutput = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(errOutput).toMatch(/validation failed/i)
  })

  it('CON-09: rejects manifest with auth enabled but no providers', async () => {
    const code = await runCommand(makeArgs(writeManifest(tmpDir, MANIFEST_CON_09), tmpDir), {})
    expect(code).toBe(1)
    expect(orchestrateAndExecuteManifest).not.toHaveBeenCalled()
  })

  it('REF-09: rejects manifest with field-mapping referencing nonexistent field', async () => {
    const code = await runCommand(makeArgs(writeManifest(tmpDir, MANIFEST_REF_09), tmpDir), {})
    expect(code).toBe(1)
    expect(orchestrateAndExecuteManifest).not.toHaveBeenCalled()
  })

  // ── Execution is called correctly ─────────────────────────────────────────

  it('calls orchestrateAndExecuteManifest for valid manifest', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir), {})
    expect(orchestrateAndExecuteManifest).toHaveBeenCalledTimes(1)
  })

  it('passes correct manifest to executor', async () => {
    await runCommand(makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir), {})
    const [manifest] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect((manifest as any).applicationName).toBe('RunTestApp')
  })

  // ── CLI arg → config propagation ─────────────────────────────────────────

  it('passes mode=strict to execution config', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir, { mode: 'strict' }), {})

    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.mode).toBe('strict')
  })

  it('passes mode=resilient to execution config by default', async () => {
    await runCommand(makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir), {})
    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.mode).toBe('resilient')
  })

  it('passes dryRun=true to execution config', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir, { dryRun: true }), {})

    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.dryRun).toBe(true)
  })

  it('passes workspaceRoot to execution config', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir), {})

    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.workspaceRoot).toBe(tmpDir)
  })

  it('passes timeoutMs to execution config', async () => {
    await runCommand(
      makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir, { timeoutMs: 30_000 }),
      {},
    )
    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.timeoutMs).toBe(30_000)
  })

  it('passes maxAttempts to execution config', async () => {
    await runCommand(
      makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir, { maxAttempts: 3 }),
      {},
    )
    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.maxAttempts).toBe(3)
  })

  // ── Config file fallback ───────────────────────────────────────────────────
  // CLI args take precedence; config file provides defaults when args are unset.

  it('uses config.mode as fallback when args.mode is not explicitly set', async () => {
    const config: AverosConfig = { mode: 'strict' }

    // Pass undefined mode to simulate no explicit CLI flag
    const args = makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir, {
      mode: undefined as any,
    })

    await runCommand(args, config)

    const [, orchConfig] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(orchConfig.mode).toBe('strict')
  })

  it('CLI mode overrides config.mode', async () => {
    const config: AverosConfig = { mode: 'strict' }

    await runCommand(
      makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir, { mode: 'resilient' }),
      config,
    )

    const [, orchConfig] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    // CLI arg wins over config file
    expect(orchConfig.mode).toBe('resilient')
  })

  it('uses config.maxAttempts as fallback', async () => {
    const config: AverosConfig = { maxAttempts: 5 }

    const args = makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir, {
      maxAttempts: undefined as any,
    })

    await runCommand(args, config)

    const [, orchConfig] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(orchConfig.maxAttempts).toBe(5)
  })

  // ── Output ────────────────────────────────────────────────────────────────

  it('writes execution summary to stdout on success', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir), {})

    const output = getStdout(stdoutSpy)
    expect(output).toContain('Execution Summary')
    expect(output).toContain('SUCCESS')
  })

  it('includes failure details in output when execution fails', async () => {
    ;(orchestrateAndExecuteManifest as jest.Mock).mockResolvedValue({
      ...mockSummary,
      success: false,
      failed: 1,
      failures: [
        {
          nodeId: 'entity:Task',
          message: 'Command not found',
          exitCode: 127,
          failedAt: new Date().toISOString(),
        },
      ],
    })
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir), {})

    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('')
    expect(output).toContain('Failures')
    expect(output).toContain('entity:Task')
    expect(output).toContain('Command not found')
  })

  it('prints validation errors to stderr on invalid manifest', async () => {
    const manifestPath = writeManifest(tmpDir, MANIFEST_REF_01)
    await runCommand(makeArgs(manifestPath, tmpDir), {})

    const errOutput = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(errOutput).toMatch(/validation failed/i)
  })

  // ── Summary line counts ───────────────────────────────────────────────────

  it('reports correct counts in summary output', async () => {
    ;(orchestrateAndExecuteManifest as jest.Mock).mockResolvedValue({
      ...mockSummary,
      total: 10,
      succeeded: 8,
      failed: 1,
      skipped: 1,
      cancelled: 0,
      success: false,
      failures: [
        {
          nodeId: 'entity:X',
          message: 'failed',
          failedAt: new Date().toISOString(),
        },
      ],
    })

    await runCommand(makeArgs(writeManifest(tmpDir, VALID_MANIFEST), tmpDir), {})

    const output = getStdout(stdoutSpy)
    expect(output).toContain('10')
    expect(output).toContain('8')
    expect(output).toContain('1')
  })

  // ── Config file integration ────────────────────────────────────────────────

  it('uses mode from averos.config.json when not overridden by args', async () => {
    const config: AverosConfig = { mode: 'strict' }
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)

    // Pass args without an explicit mode override — relies on config
    const args = makeArgs(manifestPath, tmpDir)
    // Simulate no mode explicitly passed by user — unset it
    // The command should fall back to config.mode
    const argsWithNoMode = { ...args, mode: undefined as any }

    await runCommand(argsWithNoMode, config)

    const [, orchConfig] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(orchConfig.mode).toBe('strict')
  })

  // ── Timeout and retry ────────────────────────────────────────────────────

  it('passes timeoutMs when specified', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir, { timeoutMs: 30_000 }), {})

    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.timeoutMs).toBe(30_000)
  })

  it('passes maxAttempts when specified', async () => {
    const manifestPath = writeManifest(tmpDir, VALID_MANIFEST)
    await runCommand(makeArgs(manifestPath, tmpDir, { maxAttempts: 3 }), {})

    const [, config] = (orchestrateAndExecuteManifest as jest.Mock).mock.calls[0]
    expect(config.maxAttempts).toBe(3)
  })
})
