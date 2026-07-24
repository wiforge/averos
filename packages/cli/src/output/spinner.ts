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
// Rotating cursor spinner for long-running operations.
//
// - Writes directly to process.stdout using ANSI escape codes
// - Clears the current line on each tick
// - Stops cleanly on success, failure, or warning
// - Respects NO_COLOR / non-TTY environments (degrades to dots)
// - Never interferes with log lines written between ticks
// =============================================================================

import { colors } from './colors'

const FRAMES_TTY = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const FRAMES_PLAIN = ['.', '..', '...', '....']
const INTERVAL_MS = 80

export class Spinner {
  private timer: ReturnType<typeof setInterval> | null = null
  private frame = 0
  private message = ''
  private readonly frames: string[]
  private readonly isTTY: boolean

  constructor() {
    this.isTTY = !!process.stdout.isTTY && colors.isEnabled()
    this.frames = this.isTTY ? FRAMES_TTY : FRAMES_PLAIN
  }

  // ── Start ────────────────────────────────────────────────────────────────

  start(message: string): this {
    this.message = message
    this.frame = 0

    if (this.timer) this.stop(null)

    if (this.isTTY) {
      process.stdout.write('\x1b[?25l') // hide cursor
    }

    this.render()

    this.timer = setInterval(() => {
      this.frame = (this.frame + 1) % this.frames.length
      this.render()
    }, INTERVAL_MS)

    return this
  }

  // ── Update message mid-spin ───────────────────────────────────────────────

  update(message: string): this {
    this.message = message
    this.render()
    return this
  }

  // ── Stop states ───────────────────────────────────────────────────────────

  succeed(message?: string): void {
    this.stop(`${colors.green('✓')} ${message ?? this.message}`)
  }

  fail(message?: string): void {
    this.stop(`${colors.red('✗')} ${message ?? this.message}`)
  }

  warn(message?: string): void {
    this.stop(`${colors.yellow('⚠')} ${message ?? this.message}`)
  }

  info(message?: string): void {
    this.stop(`${colors.cyan('ℹ')} ${message ?? this.message}`)
  }

  // ── Clear without printing a final line ───────────────────────────────────

  clear(): void {
    this.stop(null)
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.isTTY) return

    const frame = colors.cyan(this.frames[this.frame])
    const line = `  ${frame} ${this.message}`

    // \r moves to start of line, \x1b[K clears to end
    process.stdout.write(`\r\x1b[K${line}`)
  }

  private stop(finalLine: string | null): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    if (this.isTTY) {
      process.stdout.write('\r\x1b[K') // clear spinner line
      process.stdout.write('\x1b[?25h') // restore cursor
    }

    if (finalLine !== null && (this.isTTY || process.env['FORCE_COLOR'])) {
      process.stdout.write(`  ${finalLine}\n`)
    }
  }

  get isSpinning(): boolean {
    return this.timer !== null
  }
}
