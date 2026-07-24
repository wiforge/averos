# @averos/ai

> LLM adapters and manifest generation pipeline for Averos. Translates natural language intent into validated JSON manifests — with automatic retry, multi-turn conversation, and support for cloud and local LLM providers.

---

## Overview

`@averos/ai` is Layer 1 of the Averos pipeline. Its only job is to produce a valid `Manifest` from natural language. The DAG engine and executor handle everything after that.

```
User intent (string)
      │
      ▼
 LLM Adapter            Calls cloud or local LLM API
      │
      ▼
 generateManifest()     Parse JSON → validate → retry on error
      │
      ▼
 Valid Manifest          Ready for @averos/dag-engine
```

The LLM never touches schematics, DAGs, or execution. It is a structured JSON writer that interprets natural language into the manifest IR.

---

## Installation

```bash
npm install @averos/ai
```

---

## Quick Start

### Generate a manifest

```typescript
import { generateManifest, GeminiAdapter } from '@averos/ai'

const llm    = new GeminiAdapter()   // GEMINI_API_KEY must be set
const result = await generateManifest(
  'A task management app with ToDo items and subtasks',
  llm,
)

console.log(result.manifest)     // valid Manifest object
console.log(result.attempts)     // number of LLM calls made
console.log(result.warnings)     // validation warnings (non-blocking)
```

### Full pipeline (generate + execute)

```typescript
import { runIntentPipeline, OllamaAdapter } from '@averos/ai'
import { FileCheckpointStore, FileStateStore, AngularSchematicsAdapter } from '@averos/executor'
import { commandRegistry, emptyState } from '@averos/dag-engine'

const result = await runIntentPipeline({
  intent: 'A blog with posts and comments, keycloak authentication',
  llm:    new OllamaAdapter({ model: 'qwen2.5-coder:7b' }),
  config: {
    registry:        commandRegistry,
    adapter:         new AngularSchematicsAdapter(),
    checkpointStore: new FileCheckpointStore('.averos/checkpoints.json'),
    stateStore:      new FileStateStore('.averos/state.json'),
    workspaceRoot:   '/path/to/workspace',
    mode:            'resilient',
  },
  state: emptyState(),
})

console.log(result.summary.success)
console.log(result.manifestAttempts)
```

### Multi-turn conversation

```typescript
import { ConversationSession, AnthropicAdapter } from '@averos/ai'

const session = new ConversationSession(new AnthropicAdapter())

// Turn 1 — initial design
const r1 = await session.send('Build a task management app')
console.log(r1.manifest)   // full manifest

// Turn 2 — incremental update
const r2 = await session.send('Add a priority field to the ToDo entity')
console.log(r2.manifest)   // updated manifest — only the field changed

// Turn 3 — further refinement
const r3 = await session.send('Add keycloak authentication')
console.log(r3.manifest)   // updated manifest — auth added
```

---

## LLM Adapters

All adapters implement the `LLMAdapter` interface:

```typescript
interface LLMAdapter {
  complete(prompt: string): Promise<string>
}
```

### `AnthropicAdapter`

Calls the Anthropic Claude API.

```typescript
import { AnthropicAdapter } from '@averos/ai'

const llm = new AnthropicAdapter()
// Reads ANTHROPIC_API_KEY from environment
// Default model: claude-sonnet-4-20250514
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### `GeminiAdapter`

Calls the Google Gemini API (free tier available).

```typescript
import { GeminiAdapter } from '@averos/ai'

const llm = new GeminiAdapter()
// Reads GEMINI_API_KEY from environment
// Default model: gemini-2.0-flash

// With options:
const llm2 = new GeminiAdapter({
  model:           'gemini-2.5-flash',
  temperature:     0.1,
  maxOutputTokens: 8192,
  jsonMode:        true,   // constrains output to valid JSON
})
```

Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

```bash
export GEMINI_API_KEY=AIza...
```

### `OpenAIAdapter`

Calls the OpenAI API.

```typescript
import { OpenAIAdapter } from '@averos/ai'

const llm = new OpenAIAdapter()
// Reads OPENAI_API_KEY from environment
// Default model: gpt-4o
```

```bash
export OPENAI_API_KEY=sk-...
```

### `OllamaAdapter`

Calls a local [Ollama](https://ollama.ai) instance. No API key required.

```typescript
import { OllamaAdapter } from '@averos/ai'

// Local Ollama (default: http://localhost:11434)
const llm = new OllamaAdapter()

// Remote Ollama (e.g. on LAN or VM host)
const llm2 = new OllamaAdapter({
  baseUrl: 'http://192.168.1.50:11434',
  model:   'qwen2.5-coder:7b',
})

// Check model availability
const available = await llm.isModelAvailable()
const models    = await llm.listModels()
```

**Prerequisites:**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (recommended for JSON generation)
ollama pull qwen2.5-coder:7b

# Start the server (or it starts automatically)
ollama serve
```

**Model recommendations for manifest generation:**

| Model | Size | JSON quality | Notes |
|---|---|---|---|
| `qwen2.5-coder:7b` | 7B | ★★★★★ | Best local choice |
| `qwen2.5-coder:14b` | 14B | ★★★★★ | Better reasoning, needs 16 GB RAM |
| `deepseek-r1:8b` | 8B | ★★★★☆ | Strong reasoning |
| `llama3.1:8b` | 8B | ★★★★☆ | Reliable, widely supported |
| `mistral:7b` | 7B | ★★★☆☆ | Occasional prose leakage |
| `llama3.2:3b` | 3B | ★★★☆☆ | Fast, use for testing only |

### `LocalOpenAIAdapter`

Calls any OpenAI-compatible local server — LM Studio, LocalAI, vLLM, llama.cpp, Jan, GPT4All.

```typescript
import { LocalOpenAIAdapter } from '@averos/ai'

// LM Studio (default port 1234)
const llm = new LocalOpenAIAdapter()

// Custom server
const llm2 = new LocalOpenAIAdapter({
  baseUrl: 'http://192.168.1.50:1234',
  model:   'qwen2.5-coder-7b',
  apiKey:  'local',   // most local servers ignore this
})
```

### `buildLLMAdapter` factory

```typescript
import { buildLLMAdapter } from '@averos/ai'

// Simple — uses environment variables and defaults
const llm = buildLLMAdapter('gemini')

// With options — for remote/local providers
const llm2 = buildLLMAdapter('ollama', {
  ollama: {
    baseUrl: 'http://10.0.2.2:11434',   // VM host
    model:   'qwen2.5-coder:7b',
  },
})

const llm3 = buildLLMAdapter('local', {
  local: {
    baseUrl: 'http://localhost:1234',
    model:   'qwen2.5-coder-7b',
  },
})
```

---

## `generateManifest`

The core generation function. Calls the LLM, parses the response, validates it, and retries on failure.

```typescript
import { generateManifest } from '@averos/ai'

const result = await generateManifest(
  userIntent,   // natural language string
  llm,          // any LLMAdapter
  {
    maxRetries: 3,   // default: 3
    onValidationFailure: (errors, attempt) => {
      console.warn(`Attempt ${attempt} failed:`, errors)
    },
  },
)

// result.manifest    — the valid Manifest
// result.attempts    — how many LLM calls were made (1–maxRetries)
// result.warnings    — validation warnings (non-blocking)
```

### Retry loop

When the LLM produces an invalid manifest, the validator's error messages are injected back into the next prompt:

```
Attempt 1 → invalid manifest → REF-01: field "title" references unknown entity "Ghost"
Attempt 2 → LLM receives error + previous response → corrected manifest → valid ✓
```

---

## `ConversationSession`

Multi-turn session that carries manifest history across messages. Each turn produces an incremental update — the LLM only changes what was requested.

```typescript
import { ConversationSession } from '@averos/ai'

const session = new ConversationSession(llm)

// Properties
session.currentManifest   // Manifest | null
session.turnCount         // number

// Methods
await session.send(message)   // → GenerateManifestResult
session.reset()               // clears manifest and history
```

On the first turn, `send()` generates a full manifest. On subsequent turns, the current manifest is included in the prompt so the LLM makes targeted edits rather than regenerating from scratch.

---

## `runIntentPipeline`

End-to-end pipeline: generate manifest → validate → orchestrate → execute.

```typescript
import { runIntentPipeline } from '@averos/ai'

const result = await runIntentPipeline({
  intent:       'Build a CRM app',
  llm,
  config:       orchConfig,         // OrchestrationConfig from @averos/executor
  state:        currentState,       // State | null
  executeAfter: true,               // default: true
  generateOpts: { maxRetries: 5 },
})

// result.manifest          — the generated Manifest
// result.manifestAttempts  — LLM calls made
// result.warnings          — validation warnings
// result.summary           — RunnerSummary from executor
```

Set `executeAfter: false` for generation-only (no schematics run).

---

## System Prompt

The system prompt in `src/prompts/system.ts` is the contract between natural language and the Manifest schema. It defines:

- Required and optional manifest fields
- Entity and field naming conventions
- Relationship modeling rules
- Authentication configuration patterns
- Validation rules the LLM must satisfy

**The system prompt is the most important file in the package.** Changes here affect all generated manifests. Version it carefully.

---

## Prompt Splitting

All adapters split the combined prompt into a system instruction and a user message before sending to the API. Models perform significantly better when schema rules are in the system role and the user intent is in the user role.

The split happens on the last occurrence of `User request:` or `User wants to change:` in the prompt — these markers are written by `prompts/retry.ts` and `prompts/system.ts`.

---

## Package Structure

```
packages/ai/
├── src/
│   ├── index.ts                    Public API + buildLLMAdapter factory
│   ├── adapters/
│   │   ├── types.ts                LLMAdapter interface
│   │   ├── anthropic.ts            AnthropicAdapter
│   │   ├── openai.ts               OpenAIAdapter
│   │   ├── gemini.ts               GeminiAdapter
│   │   ├── ollama.ts               OllamaAdapter
│   │   ├── local-openai.ts         LocalOpenAIAdapter
│   │   └── prompt-utils.ts         splitPrompt, stripMarkdownFences
│   ├── prompts/
│   │   ├── system.ts               System prompt (schema contract)
│   │   ├── retry.ts                Retry prompt builder
│   │   └── examples.ts             Few-shot examples
│   ├── generation/
│   │   ├── manifest-generator.ts   generateManifest() with retry loop
│   │   └── types.ts                GenerateManifestResult, options
│   ├── pipeline/
│   │   └── intent-pipeline.ts      runIntentPipeline()
│   └── conversation/
│       └── session.ts              ConversationSession
└── tests/
    ├── unit/
    │   └── manifest-generator.test.ts
    │   └── session.test.ts
    │   
    ├── contract/
    │   └── anthropic.contract.test.ts
    │   └── openai.contract.test.ts
    │   └── self-repair.contract.test.ts
    │   └── incremental-update.contract.test.ts
    │   
    └── e2e/
        └── crm.e2e.test.ts
        └── todo-app.e2e.test.ts
```

---

## Testing

```bash
pnpm nx test @averos/ai
```

Tests use mock LLM adapters — no real API calls are made. The `INVALID_REF_01` fixture triggers REF-01 validation reliably for retry loop testing.

---

## License

Copyright © 2020-2026 Houssemeddine LAOUITI (Wiforge).

Released under the [MIT LICENSE](../../LICENSE).

---

<p align="center">
  Built with ❤️ by the <a href="https://github.com/wiforge">Wiforge</a> team · Part of the <a href="https://github.com/wiforge/averos">Averos Platform</a>
</p>