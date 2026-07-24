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

export type AverosConfig = {
  /** Default workspace root. Overridden by --workspace flag. */
  workspaceRoot?: string

  /** Default execution mode. Overridden by --mode flag. */
  mode?: 'strict' | 'resilient'

  /** Default manifest path. */
  manifestPath?: string

  /** State file path. Default: .averos/state.json */
  statePath?: string

  /** Checkpoint file path. Default: .averos/checkpoints.json */
  checkpointPath?: string

  /** Default session timeout in ms. */
  timeoutMs?: number

  /** Max retry attempts per node. */
  maxAttempts?: number

  /**
   * Path to local @averos/workflow .tgz.
   * When set, installs from this file instead of the npm registry.
   * Overridden by --tgz flag.
   */
  localTgz?: string

  /**
   * Activates development mode
   *
   */
  development?: boolean
  /**
   * Averos version string — required when localTgz is set.
   * Injected as --averos-version into the create-application schematic.
   * Overridden by --averos-version flag.
   */
  averosVersion?: string

  /**
   * Directory for per-node execution logs.
   * Default: <workspaceRoot>/logs
   * Overridden by --logs-dir flag.
   */
  logsDir?: string

  /** LLM provider to use for generate command. */
  llmProvider?: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'local'

  /** Base URL for Ollama server. Default: http://localhost:11434 */
  ollamaBaseUrl?: string

  /** Ollama model name. Default: qwen2.5-coder:7b */
  ollamaModel?: string

  /** Base URL for local OpenAI-compatible server. Default: http://localhost:1234 */
  localLlmBaseUrl?: string

  /** Model name for local OpenAI-compatible server. */
  localLlmModel?: string

  /** Timeout for LLM HTTP requests in ms. Default: 300000 (5 minutes).
   *  Separate from timeoutMs which controls schematic execution.
   *  Set higher for slow local models over a network. */
  llmTimeoutMs?: number
}
