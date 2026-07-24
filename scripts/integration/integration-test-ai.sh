#!/usr/bin/env bash
# =============================================================================
# scripts/integration/integration-test-ai.sh
#
# Validates:
#   - AI prompt construction and system prompt
#   - generateManifest retry loop
#   - Validation integration (bad manifest → retry)
#   - ConversationSession multi-turn behavior
#   - Full pipeline handoff to executor
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo "── Averos AI Smoke Test ────────────────────────────"
echo ""

cd "$ROOT_DIR"

npx tsx \
  --tsconfig "$ROOT_DIR/scripts/integration/tsconfig.json" \
  "$SCRIPT_DIR/integration-test-ai.ts"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ smoke-test-ai passed"
else
  echo "✗ smoke-test-ai FAILED (exit $EXIT_CODE)"
  exit $EXIT_CODE
fi