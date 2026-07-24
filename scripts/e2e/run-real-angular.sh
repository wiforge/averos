#!/usr/bin/env bash
# =============================================================================
# scripts/e2e/run-real-angular.sh
#
# Remote/CI harness — installs @averos/workflow from npm registry.
#
# Usage:
#   bash scripts/e2e/run-real-angular.sh [OPTIONS]
#
# Options:
#   --skip-build          Skip package build step
#   --keep-workspace      Preserve temp workspace on exit
#   --dry-run             Use mock adapter (no real schematics)
#   --timeout=<ms>        Session timeout (default: 600000)
#   --manifest=<path>     Manifest JSON path (default: golden reference)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/lib/harness-common.sh"

SKIP_BUILD=false
KEEP_WORKSPACE=false
DRY_RUN=false
TIMEOUT_MS=600000
MANIFEST_FILE="$SCRIPT_DIR/../golden-reference/todoapp-manifest.json"

for arg in "$@"; do
  case $arg in
    --skip-build)     SKIP_BUILD=true ;;
    --keep-workspace) KEEP_WORKSPACE=true ;;
    --dry-run)        DRY_RUN=true ;;
    --timeout=*)      TIMEOUT_MS="${arg#*=}" ;;
    --manifest=*)     MANIFEST_FILE="${arg#*=}" ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

setup_workspace "${KEEP_WORKSPACE}"
check_prerequisites
build_packages "$SKIP_BUILD" "$ROOT_DIR"

log_section "E2E Test — Remote (npm registry)"
log_info "Manifest  : $MANIFEST_FILE"
log_info "Workspace : $WORKSPACE_DIR"
log_info "Logs      : $LOGS_DIR"

node "$SCRIPT_DIR/dist/run-real-angular.js" \
  --manifest="$MANIFEST_FILE" \
  --workspace="$WORKSPACE_DIR" \
  --state-dir="$STATE_DIR" \
  --logs-dir="$LOGS_DIR" \
  --results="$RESULTS_FILE" \
  --timeout="$TIMEOUT_MS" \
  --dry-run="$DRY_RUN"

report_results "$RESULTS_FILE"