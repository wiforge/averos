#!/usr/bin/env bash
# =============================================================================
# scripts/integration/integration-test-executor.sh
#
# Validates:
#   - DAG construction and topological sort
#   - Runner loop with mock adapter
#   - State persistence after success
#   - Checkpoint clearing on full success
#   - Idempotency: second run against saved state executes nothing
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo "── Averos Executor Smoke Test ──────────────────────"
echo ""

cd "$ROOT_DIR"

npx tsx \
  --tsconfig "$ROOT_DIR/scripts/integration/tsconfig.json" \
  "$SCRIPT_DIR/integration-test-executor.ts"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ smoke-test-executor passed"
else
  echo "✗ smoke-test-executor FAILED (exit $EXIT_CODE)"
  exit $EXIT_CODE
fi