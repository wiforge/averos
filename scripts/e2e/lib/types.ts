// =============================================================================
// scripts/e2e/lib/types.ts
// =============================================================================

export type TestResult = {
  name:        string
  passed:      boolean
  durationMs?: number
  error?:      string
  details?:    Record<string, unknown>
}

export type E2EResults = {
  totalDurationMs: number
  tests:           TestResult[]
  success:         boolean
  workspaceDir:    string
  logsDir:         string
}

export type E2EArgs = {
  manifest:       string
  workspace:      string
  stateDir:       string
  logsDir:        string
  results:        string
  timeoutMs:      number
  /** Path to local .tgz — undefined means install from registry */
  localTgz?:      string
  /** averos version string passed to create-application (local mode only) */
  averosVersion?: string
  /** Whether to actually run schematics or use a mock adapter */
  dryRun:         boolean
}

export type NodeLog = {
  nodeId:      string
  command:     string
  runner:      string
  args:        Record<string, unknown>
  startedAt:   string
  finishedAt:  string
  durationMs:  number
  exitCode?:   number
  stdout:      string
  stderr:      string
  success:     boolean
}