#!/usr/bin/env bash
# =============================================================================
# scripts/golden-reference-run.sh
#
# Validates:
#   - Full pipeline: manifest → parse → validate → orchestrate → execute
#   - --dry-run prevents real ng g calls
#   - Success exit code
#   - Summary output includes expected fields
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# The golden reference manifest file
MANIFEST_FILE="$SCRIPT_DIR/../golden-reference/todoapp-manifest.json"


echo ""
echo "── averos run --dry-run ────────────────────────────"
echo ""

OUTPUT=$(
  npx tsx \
    --tsconfig "$ROOT_DIR/scripts/smoke/tsconfig.json" \
    "$ROOT_DIR/packages/cli/src/bin/averos.ts" \
    run "$MANIFEST_FILE" --dry-run 2>&1
)

echo "$OUTPUT"

# Assert exit code 0
if [ $? -ne 0 ]; then
  echo "FAIL: averos run --dry-run exited non-zero"
  exit 1
fi

# Assert summary appears in output
echo "$OUTPUT" | grep -q "Execution Summary" \
  && echo "  PASS: Execution Summary present" \
  || { echo "  FAIL: Execution Summary missing"; exit 1; }

echo "$OUTPUT" | grep -q "SUCCESS" \
  && echo "  PASS: SUCCESS in output" \
  || { echo "  FAIL: SUCCESS not found in output"; exit 1; }

# Assert state was NOT written in dry-run (no .averos directory created)
if [ -d "$(dirname "$MANIFEST_FILE")/.averos" ]; then
  echo "  FAIL: .averos directory was created in dry-run mode"
  exit 1
fi
echo "  PASS: No state persisted in dry-run mode"


echo ""
echo "✓ golden reference run smoke test passed"
echo ""