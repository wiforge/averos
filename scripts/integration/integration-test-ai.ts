// =============================================================================
// scripts/integration/integration-test-ai.ts
//
// Validates:
//   - generateManifest() with mock LLM
//   - Retry loop when first response is invalid
//   - Validation integration (bad manifest → retry)
//   - ConversationSession multi-turn update
//   - Pipeline handoff to executor
// =============================================================================

import { generateManifest, ConversationSession, runIntentPipeline } from '@averos/ai'
import type { LLMAdapter } from '@averos/ai'
import {
  MemoryCheckpointStore,
  MemoryStateStore,
} from '@averos/executor'
import type { OrchestrationConfig, ExecutionContext, ExecutionResult } from '@averos/executor'
import { commandRegistry, emptyState } from '@averos/dag-engine'
import type { ExecutionNode } from '@averos/dag-engine'

// ─── Shared manifests ─────────────────────────────────────────────────────────

const VALID_MANIFEST = {
  applicationName:             'AIApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name:    'Note',
      sname:   'NoteService',
      members: [
        { memberNature: 'simple', ename: 'Note', mname: 'note_id',
          memberType: 'string', memberTag: 'ID' },
        { memberNature: 'simple', ename: 'Note', mname: 'title',
          memberType: 'string', memberTag: 'BusinessID' },
        { memberNature: 'simple', ename: 'Note', mname: 'body',
          memberType: 'textarea' },
      ],
    },
  ],
  serviceConfigurations: [
    { id: 'NoteService', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/notes', apiHTTPQueryBuilder: 'mongodb' },
  ],
  useCases: [{ name: 'NoteCRUD', ename: 'Note', useCaseType: 'CRUD' }],
}

// Invalid first: field references nonexistent entity (REF-01)
const INVALID_THEN_VALID_MANIFEST = {
  applicationName:             'AIApp',
  defaultLanguageCode:         'en',
  enableAuthentication:        false,
  enableExternalEntityMapping: false,
  entities: [
    {
      name:    'Note',
      sname:   'NoteService',
      members: [
        { memberNature: 'simple', ename: 'Phantom', mname: 'title',
          memberType: 'string' },  // Phantom does not exist → REF-01
      ],
    },
  ],
  serviceConfigurations: [
    { id: 'NoteService', apiHost: 'localhost', apiPort: 3000,
      apiProtocol: 'http', apiEndPoint: '/api/notes', apiHTTPQueryBuilder: 'mongodb' },
  ],
}

const UPDATED_MANIFEST = {
  ...VALID_MANIFEST,
  entities: [
    {
      ...VALID_MANIFEST.entities[0],
      members: [
        ...VALID_MANIFEST.entities[0].members,
        { memberNature: 'simple', ename: 'Note', mname: 'createdDate',
          memberType: 'date' },
      ],
    },
  ],
}

// ─── Assertion helper ─────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) {
    process.stderr.write(`  FAIL: ${message}\n`)
    process.exit(1)
  }
  process.stdout.write(`  PASS: ${message}\n`)
}

// ─── Mock adapters ────────────────────────────────────────────────────────────

function makeSuccessAdapter(): LLMAdapter {
  return { complete: async () => JSON.stringify(VALID_MANIFEST) }
}

function makeRetryAdapter(): LLMAdapter {
  let calls = 0
  return {
    complete: async () => {
      calls++
      return JSON.stringify(calls === 1 ? INVALID_THEN_VALID_MANIFEST : VALID_MANIFEST)
    },
  }
}

function makeConversationAdapter(): LLMAdapter {
  let calls = 0
  return {
    complete: async () => {
      calls++
      return JSON.stringify(calls === 1 ? VALID_MANIFEST : UPDATED_MANIFEST)
    },
  }
}

function makeDryRunExecutorConfig(dryRun = true): OrchestrationConfig {
  return {
    registry:        commandRegistry,
    adapter:         { execute: async (_n: ExecutionNode, _c: ExecutionContext): Promise<ExecutionResult> =>
                       ({ success: true, durationMs: 0 }) },
    checkpointStore: new MemoryCheckpointStore(),
    stateStore:      new MemoryStateStore(),
    workspaceRoot:   '/tmp/ai-smoke',
    mode:            'resilient',
    dryRun,
  }
}

// ─── Test 1: generateManifest — happy path ────────────────────────────────────

async function testGenerateManifestSuccess(): Promise<void> {
  process.stdout.write('\n[1] generateManifest — happy path\n')

  const result = await generateManifest('Build a note-taking app', makeSuccessAdapter())

  assert(result.manifest !== null,  'Manifest is defined')
  assert(result.attempts === 1,     'Succeeded on first attempt')
  assert(Array.isArray(result.warnings), 'Warnings is an array')
  assert(
    (result.manifest as any).applicationName === 'AIApp',
    'Correct applicationName',
  )
}

// ─── Test 2: generateManifest — retry on invalid ──────────────────────────────

async function testGenerateManifestRetry(): Promise<void> {
  process.stdout.write('\n[2] generateManifest — retry on invalid manifest (REF-01)\n')

  const failures: string[][] = []

  const result = await generateManifest(
    'Build a note app',
    makeRetryAdapter(),
    {
      maxRetries: 3,
      onValidationFailure: (errors) => {
        failures.push(errors)
        process.stdout.write(`  retry triggered — ${errors.length} error(s): ${errors[0]}\n`)
      },
    },
  )

  assert(result.attempts === 2,     'Succeeded on second attempt (after retry)')
  assert(failures.length === 1,     'onValidationFailure called once')
  assert(failures[0].length > 0,    'Failure contained error messages')
  assert(result.manifest !== null,  'Final manifest is valid')
}

// ─── Test 3: generateManifest — exhausts retries ─────────────────────────────

async function testGenerateManifestExhausted(): Promise<void> {
  process.stdout.write('\n[3] generateManifest — exhausts retries\n')

  const alwaysInvalid: LLMAdapter = {
    complete: async () => JSON.stringify(INVALID_THEN_VALID_MANIFEST),
  }

  let threw = false
  try {
    await generateManifest('Build an app', alwaysInvalid, { maxRetries: 2 })
  } catch (err) {
    threw = true
    process.stdout.write(`  threw as expected: ${(err as Error).message.slice(0, 80)}\n`)
  }

  assert(threw, 'Throws when all retries exhausted')
}

// ─── Test 4: ConversationSession — multi-turn ─────────────────────────────────

async function testConversationSession(): Promise<void> {
  process.stdout.write('\n[4] ConversationSession — multi-turn update\n')

  const session = new ConversationSession(makeConversationAdapter())

  assert(session.currentManifest === null, 'Starts with null manifest')
  assert(session.turnCount === 0,          'Starts with turnCount 0')

  const turn1 = await session.send('Build a note-taking app')
  assert(turn1.manifest !== null,   'Turn 1 produced manifest')
  assert(session.turnCount === 1,   'turnCount is 1 after turn 1')

  const membersBefore = (session.currentManifest as any).entities[0].members.length

  const turn2 = await session.send('Add a createdDate field to Note')
  assert(turn2.manifest !== null,   'Turn 2 produced manifest')
  assert(session.turnCount === 2,   'turnCount is 2 after turn 2')

  const membersAfter = (session.currentManifest as any).entities[0].members.length
  assert(membersAfter > membersBefore, `Turn 2 added a field (${membersBefore} → ${membersAfter})`)
}

// ─── Test 5: runIntentPipeline — end-to-end ───────────────────────────────────

async function testIntentPipeline(): Promise<void> {
  process.stdout.write('\n[5] runIntentPipeline — end-to-end (dry-run)\n')

  let executedCount = 0
  const config: OrchestrationConfig = {
    registry:        commandRegistry,
    adapter: {
      execute: async (_n: ExecutionNode, _c: ExecutionContext): Promise<ExecutionResult> => {
        executedCount++
        return { success: true, durationMs: 0 }
      },
    },
    checkpointStore: new MemoryCheckpointStore(),
    stateStore:      new MemoryStateStore(),
    workspaceRoot:   '/tmp/ai-smoke',
    mode:            'resilient',
    dryRun:          true,
  }

  const result = await runIntentPipeline({
    intent:       'Build a note-taking app',
    llm:          makeSuccessAdapter(),
    config,
    state:        emptyState(),
    executeAfter: true,
  })

  assert(result.manifestAttempts === 1,   'Manifest generated in 1 attempt')
  assert(result.summary.success,          'Pipeline succeeded')
  assert(result.summary.total > 0,        `Plan had ${result.summary.total} nodes`)
  assert(Array.isArray(result.warnings),  'Warnings is array')

  // In dry-run mode, state is NOT persisted
  const state = await config.stateStore.load()
  assert(state === null, 'State not persisted in dry-run mode')
}

// ─── Test 6: runIntentPipeline — executeAfter=false ───────────────────────────

async function testIntentPipelineNoExecute(): Promise<void> {
  process.stdout.write('\n[6] runIntentPipeline — executeAfter=false (generation only)\n')

  let executorCalled = false
  const config: OrchestrationConfig = {
    ...makeDryRunExecutorConfig(),
    adapter: {
      execute: async () => {
        executorCalled = true
        return { success: true, durationMs: 0 }
      },
    },
  }

  const result = await runIntentPipeline({
    intent:       'Build a note-taking app',
    llm:          makeSuccessAdapter(),
    config,
    executeAfter: false,
  })

  assert(!executorCalled,           'Executor not called when executeAfter=false')
  assert(result.manifest !== null,  'Manifest still returned')
  assert(result.summary.success,    'Summary success=true (empty summary)')
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  process.stdout.write('── Averos AI Smoke Test ────────────────────────────\n')

  await testGenerateManifestSuccess()
  await testGenerateManifestRetry()
  await testGenerateManifestExhausted()
  await testConversationSession()
  await testIntentPipeline()
  await testIntentPipelineNoExecute()

  process.stdout.write('\n✓ All AI smoke tests passed\n\n')
}

main().catch(err => {
  process.stderr.write(`\nFATAL: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})