# =============================================================================
# scripts/e2e/lib/harness-common.sh
#
# Shared shell functions sourced by both harness scripts.
# Must be sourced, not executed.
# =============================================================================

# ─── Colors ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log_section() { echo -e "\n${BOLD}${CYAN}── $1 ${RESET}"; }
log_pass()    { echo -e "  ${GREEN}✓${RESET} $1"; }
log_fail()    { echo -e "  ${RED}✗${RESET} $1"; }
log_info()    { echo -e "  ${YELLOW}▶${RESET} $1"; }

# ─── Workspace setup ──────────────────────────────────────────────────────────

setup_workspace() {
  # Store in a global so the trap can read it
  export E2E_KEEP_WORKSPACE="${1:-false}"

  TMP_DIR="$(mktemp -d /tmp/averos-e2e-XXXXXX)"
  WORKSPACE_DIR="$TMP_DIR/workspace"
  STATE_DIR="$TMP_DIR/.averos"
  LOGS_DIR="$TMP_DIR/logs"
  RESULTS_FILE="$TMP_DIR/e2e-results.json"

  mkdir -p "$WORKSPACE_DIR" "$STATE_DIR" "$LOGS_DIR"

  cleanup() {
    local exit_code=$?
    if [ "${E2E_KEEP_WORKSPACE:-false}" = "false" ]; then
      rm -rf "$TMP_DIR"
    else
      echo ""
      echo -e "${YELLOW}Workspace preserved:${RESET} $TMP_DIR"
      echo -e "${YELLOW}Logs directory:${RESET}      $LOGS_DIR"
      echo -e "${YELLOW}Results file:${RESET}        $RESULTS_FILE"
    fi
    exit $exit_code
  }
  trap cleanup EXIT

  echo ""
  echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  Averos E2E Integration Test — Real Angular Build  ${RESET}"
  echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
  echo ""
  log_info "Temp dir  : $TMP_DIR"
}

# ─── Prerequisite checks ──────────────────────────────────────────────────────

check_prerequisites() {
  log_section "Checking prerequisites"

  for cmd in node npm ng npx; do
    if command -v "$cmd" &>/dev/null; then
      log_pass "$cmd: $(command -v "$cmd")"
    else
      log_fail "$cmd not found — required for E2E tests"
      exit 1
    fi
  done

  local node_version
  node_version="$(node --version)"
  log_info "Node: $node_version"

  local npm_version
  npm_version="$(npm --version)"
  log_info "npm: $npm_version"

  local ng_version
  ng_version="$(ng version 2>/dev/null | grep -i 'Angular CLI' | awk '{print $NF}' || echo 'unknown')"
  log_info "Angular CLI: $ng_version"
}

# ─── Package build ────────────────────────────────────────────────────────────

build_packages() {
  local skip_build="$1"
  local root_dir="$2"

  local runner_js="$root_dir/scripts/e2e/dist/run-real-angular.js"
  # Compile E2E runner scripts
  log_info "Compiling E2E runner scripts..."
  cd "$root_dir"
  npx tsc --project "$root_dir/scripts/e2e/tsconfig.json"
  if [ -f "$runner_js" ]; then
    log_pass "E2E runner compiled"
  else
    log_fail "E2E runner compilation produced no output — check scripts/e2e/tsconfig.json"
    exit 1
  fi

  if [ "$skip_build" = "true" ]; then
    log_section "Skipping package build (--skip-build)"
    return
  fi

  log_section "Building packages"

  cd "$root_dir"


  # local packages=("mcp" "ai" "cli")
  # for pkg in "${packages[@]}"; do
  #   log_info "Building @averos/$pkg..."
  #   if npm run build --workspace="packages/$pkg" 2>&1 | tail -2; then
  #     log_pass "@averos/$pkg built"
  #   else
  #     log_fail "@averos/$pkg build failed"
  #     exit 1
  #   fi
  # done

  if pnpm nx run-many -t build --projects=@averos/cli,@averos/ai,@averos/mcp 2>&1; then
    log_pass "All packages built"
  else
    log_fail "Package build failed"
    exit 1
  fi

  # Verify compiled runner exists
  # local runner_js="$root_dir/scripts/e2e/dist/run-real-angular.js"
  # if [ ! -f "$runner_js" ]; then
  #   log_info "Compiling E2E runner scripts..."
  #   npx tsc --project "$root_dir/scripts/e2e/tsconfig.json"
  #   log_pass "E2E runner compiled"
  # fi
  # Compile E2E runner if needed

}

# ─── Results reporting ────────────────────────────────────────────────────────

report_results() {
  local results_file="$1"

  if [ ! -f "$results_file" ]; then
    echo -e "\n${RED}No results file found${RESET}"
    return
  fi

  log_section "Results"

  node -e "
    const r = JSON.parse(require('fs').readFileSync('$results_file', 'utf-8'));
    const ok   = '\x1b[32m✓\x1b[0m';
    const fail = '\x1b[31m✗\x1b[0m';

    for (const t of r.tests) {
      const icon = t.passed ? ok : fail;
      const dur  = t.durationMs != null ? ' \x1b[2m(' + t.durationMs + 'ms)\x1b[0m' : '';
      process.stdout.write('  ' + icon + ' ' + t.name + dur + '\n');
      if (!t.passed && t.error) {
        process.stdout.write('    \x1b[31m→ ' + t.error.split('\n')[0] + '\x1b[0m\n');
      }
    }

    const total  = r.tests.length;
    const passed = r.tests.filter(t => t.passed).length;
    const failed = total - passed;

    process.stdout.write('\n');
    process.stdout.write('  Total: ' + total + '   Passed: ' + passed + '   Failed: ' + failed + '\n');
    process.stdout.write('  Duration: ' + r.totalDurationMs + 'ms\n');
    process.stdout.write('  Logs: ' + r.logsDir + '\n');
  "

  echo ""
  if node -e "process.exit(JSON.parse(require('fs').readFileSync('$results_file','utf-8')).success ? 0 : 1)"; then
    echo -e "${BOLD}${GREEN}✓ E2E test passed${RESET}"
  else
    echo -e "${BOLD}${RED}✗ E2E test FAILED${RESET}"
    exit 1
  fi
}