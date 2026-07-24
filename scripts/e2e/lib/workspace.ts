// =============================================================================
// scripts/e2e/lib/workspace.ts
//
// Workspace bootstrap utilities.
//
// Handles the three-step averos workspace setup:
//   1. Install @averos/workflow (from registry or local .tgz)
//   2. Bootstrap the application via create-application schematic
//   3. Resolve the application root directory
//
// All child processes run with full stdout/stderr capture.
// =============================================================================

import * as fs    from 'fs'
import * as path  from 'path'
import { spawnSync } from 'child_process'

export type BootstrapOptions = {
  /** Directory where npm install and schematics will run */
  workspaceDir:   string

  /** Application name — becomes the subdirectory created by create-application */
  appName:        string

  /** Path to local .tgz. Undefined = install from npm registry */
  localTgz?:      string

  /** Averos version string (required for local mode) */
  averosVersion?: string

  /** defaultLanguageCode passed to create-application */
  defaultLang:    string

  /** Whether to pass --enable-authentication */
  enableAuth:     boolean

  /** Whether to pass --enable-external-entity-mapping */
  enableMapping:  boolean

  /** Timeout in ms for each setup command */
  timeoutMs:      number

  /** Where to write setup logs */
  logsDir:        string
}

export type BootstrapResult = {
  /** Absolute path to the Angular application root (workspaceDir/appName) */
  appRoot:     string
  installLog:  string
  bootstrapLog: string
}

// ─── Main bootstrap ───────────────────────────────────────────────────────────

export async function bootstrapWorkspace(
  opts: BootstrapOptions,
): Promise<BootstrapResult> {

  fs.mkdirSync(opts.workspaceDir, { recursive: true })
  fs.mkdirSync(opts.logsDir,      { recursive: true })

  // ── Step 1: Install @averos/workflow ───────────────────────────────────────
  // This makes the schematics available to npx without a global install.
  const installLog = await installAveros(opts)

  // ── Step 2: App root will be created by the DAG pipeline ─────────────────
  // create-application schematic creates: workspaceDir/appName/
  // The runner's ExecutionState will update workspaceRoot to point there.
  // const appRoot = path.join(opts.workspaceDir, opts.appName)

  return { 
          appRoot: opts.workspaceDir, 
          installLog, 
          bootstrapLog: '' 
        }
}

// ─── Step 1: Install ─────────────────────────────────────────────────────────

async function installAveros(opts: BootstrapOptions): Promise<string> {

  const logPath = path.join(opts.logsDir, 'install-averos.log')

  let installCmd: string
  let installArgs: string[]

  if (opts.localTgz) {
    // ── Copy tgz into workspace so create-application can find it for a second installation inside the application folder ( workspace/appFolder) ──────────
    copyLocalTgz(opts.localTgz, opts.workspaceDir, opts.logsDir)
    // Local .tgz install — resolves the absolute path so npm can find it
    const tgzAbs = path.resolve(opts.localTgz)

    if (!fs.existsSync(tgzAbs)) {
      throw new Error(`Local averos tgz not found: ${tgzAbs}`)
    }

    installCmd  = 'npm'
    installArgs = ['install', tgzAbs]

  } else {
    // Registry install
    installCmd  = 'npm'
    installArgs = opts.averosVersion ? ['install', `@averos/workflow@${opts.averosVersion}`] : ['install', '@averos/workflow'];
  }

  const result = spawnSync(installCmd, installArgs, {
    cwd:      opts.workspaceDir,
    timeout:  opts.timeoutMs,
    encoding: 'utf-8',
    env:      { ...process.env, npm_config_fund: 'false', npm_config_audit: 'false' },
  })

  const log = buildLog(installCmd, installArgs, result)
  fs.writeFileSync(logPath, log, 'utf-8')

  if (result.status !== 0) {
    throw new Error(
      `@averos/workflow install failed (exit ${result.status})\n` +
      `Command: ${installCmd} ${installArgs.join(' ')}\n` +
      `Stderr: ${result.stderr?.slice(-500) ?? ''}`
    )
  }

  return log
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function copyLocalTgz(
  sourceTgz:    string,
  workspaceDir: string,
  logsDir:      string,
): string {

  const tgzAbs  = path.resolve(sourceTgz)
  const tgzName = path.basename(tgzAbs)
  const destPath = path.join(workspaceDir, tgzName)

  if (!fs.existsSync(tgzAbs)) {
    throw new Error(`Local tgz not found: ${tgzAbs}`)
  }

  fs.copyFileSync(tgzAbs, destPath)

  const logPath = path.join(logsDir, 'copy-tgz.log')
  const logContent = [
    `Operation  : copy local tgz to workspace`,
    `Source     : ${tgzAbs}`,
    `Destination: ${destPath}`,
    `Timestamp  : ${new Date().toISOString()}`,
    ``,
    `File size  : ${fs.statSync(destPath).size} bytes`,
  ].join('\n')

  fs.writeFileSync(logPath, logContent, 'utf-8')

  process.stdout.write(
    `\n    \x1b[2mcopied tgz → ${destPath}\x1b[0m\n`
  )

  return logContent
}

function buildLog(
  cmd:    string,
  args:   string[],
  result: ReturnType<typeof spawnSync>,
): string {
  return [
    `Command   : ${cmd} ${args.join(' ')}`,
    `Exit code : ${result.status ?? 'null'}`,
    `Duration  : (see timestamp delta)`,
    ``,
    `─── STDOUT ─────────────────────────────────────────────────────────`,
    result.stdout ?? '(empty)',
    ``,
    `─── STDERR ─────────────────────────────────────────────────────────`,
    result.stderr ?? '(empty)',
  ].join('\n')
}