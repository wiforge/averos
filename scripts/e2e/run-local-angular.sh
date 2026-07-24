#!/usr/bin/env bash
# =============================================================================
# scripts/e2e/run-local-angular.sh
#
# Local/dev harness — installs @averos/workflow from a local .tgz file.
# Use this when testing against a locally built version of the library
# before publishing to npm.
#
# Usage:
#   bash scripts/e2e/run-local-angular.sh --tgz=./wiforge-averos-2.0.0.tgz
#   bash scripts/e2e/run-local-angular.sh \
#     --tgz=./wiforge-averos-2.0.0.tgz \
#     --averos-version=2.0.0 \
#     --keep-workspace
#
# Options:
#   --tgz=<path>          Path to local .tgz (required)
#   --averos-version=<v>  Version string passed to --averos-version flag (default: 2.0.0)
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
LOCAL_TGZ=""
AVEROS_VERSION="2.0.0"

for arg in "$@"; do
  case $arg in
    --tgz=*)            LOCAL_TGZ="${arg#*=}" ;;
    --averos-version=*) AVEROS_VERSION="${arg#*=}" ;;
    --skip-build)       SKIP_BUILD=true ;;
    --keep-workspace)   KEEP_WORKSPACE=true ;;
    --dry-run)          DRY_RUN=true ;;
    --timeout=*)        TIMEOUT_MS="${arg#*=}" ;;
    --manifest=*)       MANIFEST_FILE="${arg#*=}" ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ─── Validate required args ───────────────────────────────────────────────────

if [ -z "$LOCAL_TGZ" ]; then
  echo ""
  echo "Error: --tgz=<path> is required for local testing"
  echo ""
  echo "Usage:"
  echo "  bash scripts/e2e/run-local-angular.sh --tgz=./wiforge-averos-2.0.0.tgz"
  echo ""
  exit 1
fi

TGZ_ABS="$(cd "$(dirname "$LOCAL_TGZ")" && pwd)/$(basename "$LOCAL_TGZ")"

if [ ! -f "$TGZ_ABS" ]; then
  echo "Error: tgz not found: $TGZ_ABS"
  exit 1
fi

# ─── Setup ────────────────────────────────────────────────────────────────────

setup_workspace "${KEEP_WORKSPACE}"
check_prerequisites
build_packages "$SKIP_BUILD" "$ROOT_DIR"

log_section "E2E Test — Local tgz"
log_info "Tgz       : $TGZ_ABS"
log_info "Version   : $AVEROS_VERSION"
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
  --local-tgz="$TGZ_ABS" \
  --averos-version="$AVEROS_VERSION" \
  --dry-run="$DRY_RUN"

report_results "$RESULTS_FILE"