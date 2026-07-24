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
// Minimal terminal color utilities.
//
// Design decisions:
//   - No third-party dependency (chalk, kleur, etc.)
//   - Auto-detects whether the terminal supports color
//   - Respects NO_COLOR environment variable (https://no-color.org)
//   - Respects FORCE_COLOR environment variable
//   - Falls back to plain text in non-TTY environments (CI, piped output)
//   - All functions are pure — input string in, colored string out
//   - Colors are composable: colors.bold(colors.red('error'))
//
// ANSI escape code reference:
//   \x1b[0m  — reset
//   \x1b[1m  — bold
//   \x1b[2m  — dim
//   \x1b[31m — red
//   \x1b[32m — green
//   \x1b[33m — yellow
//   \x1b[34m — blue
//   \x1b[35m — magenta
//   \x1b[36m — cyan
//   \x1b[37m — white
// =============================================================================

// ─── Color support detection ──────────────────────────────────────────────────

function supportsColor(): boolean {
  // Explicit opt-out — https://no-color.org
  if (process.env['NO_COLOR'] !== undefined) return false

  // Explicit opt-in
  if (process.env['FORCE_COLOR'] !== undefined) return true

  // Non-TTY environments (piped output, CI without color support)
  if (!process.stdout.isTTY) return false

  // Windows: only support color on modern terminals
  if (process.platform === 'win32') {
    return !!(process.env['TERM_PROGRAM'] || process.env['WT_SESSION'])
  }

  // Unix: check TERM
  const term = process.env['TERM'] ?? ''
  if (term === 'dumb') return false

  return true
}

const COLOR_ENABLED = supportsColor()

// ─── ANSI escape helpers ──────────────────────────────────────────────────────

function ansi(code: number, reset: number = 0) {
  return (text: string): string => {
    if (!COLOR_ENABLED) return text
    return `\x1b[${code}m${text}\x1b[${reset}m`
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const colors = {
  // ── Formatting ──────────────────────────────────────────────────────────────
  bold: ansi(1, 22),
  dim: ansi(2, 22),
  italic: ansi(3, 23),
  underline: ansi(4, 24),
  strikethrough: ansi(9, 29),

  // ── Foreground colors ────────────────────────────────────────────────────────
  black: ansi(30, 39),
  red: ansi(31, 39),
  green: ansi(32, 39),
  yellow: ansi(33, 39),
  blue: ansi(34, 39),
  magenta: ansi(35, 39),
  cyan: ansi(36, 39),
  white: ansi(37, 39),
  gray: ansi(90, 39),

  // ── Background colors ────────────────────────────────────────────────────────
  bgBlack: ansi(40, 49),
  bgRed: ansi(41, 49),
  bgGreen: ansi(42, 49),
  bgYellow: ansi(43, 49),
  bgBlue: ansi(44, 49),
  bgMagenta: ansi(45, 49),
  bgCyan: ansi(46, 49),
  bgWhite: ansi(47, 49),

  // ── Semantic aliases (use these in commands) ──────────────────────────────
  success: ansi(32, 39), // green
  error: ansi(31, 39), // red
  warning: ansi(33, 39), // yellow
  info: ansi(36, 39), // cyan
  muted: ansi(90, 39), // gray

  // ── Strip colors (for testing or plain output) ────────────────────────────
  strip(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[\d+m/g, '')
  },

  // ── Color detection ────────────────────────────────────────────────────────
  isEnabled(): boolean {
    return COLOR_ENABLED
  },
} as const

// ─── Named exports for direct import ─────────────────────────────────────────

export const { bold, dim, red, green, yellow, cyan, gray, strip } = colors
