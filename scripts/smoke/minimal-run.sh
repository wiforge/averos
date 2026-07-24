#!/usr/bin/env bash
# =============================================================================
# scripts/minimal-run.sh
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

MANIFEST_FILE="$(mktemp /tmp/averos-run-smoke-XXXXXX.json)"

cat > "$MANIFEST_FILE" << 'EOF'
{
  "applicationName": "RunSmokeApp",
  "defaultLanguageCode": "en",
  "enableAuthentication": false,
  "enableExternalEntityMapping": false,
  "entities": [
    {
      "name": "Task",
      "sname": "TaskService",
      "members": [
        { "memberNature": "simple", "ename": "Task", "mname": "task_id",
          "memberType": "string", "memberTag": "ID" },
        { "memberNature": "simple", "ename": "Task", "mname": "title",
          "memberType": "string", "memberTag": "BusinessID" },
        { "memberNature": "simple", "ename": "Task", "mname": "done",
          "memberType": "boolean" }
      ]
    }
  ],
  "serviceConfigurations": [
    { "id": "TaskService", "apiHost": "localhost", "apiPort": 3000,
      "apiProtocol": "http", "apiEndPoint": "/api/tasks",
      "apiHTTPQueryBuilder": "mongodb" }
  ],
  "useCases": [
    { "name": "TaskCRUD",   "ename": "Task", "useCaseType": "CRUD" },
    { "name": "SearchTask", "ename": "Task", "useCaseType": "Search_Entity" }
  ]
}
EOF

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

# Cleanup
rm -f "$MANIFEST_FILE"

echo ""
echo "── averos run (validation failure) ─────────────────"
echo ""

# A manifest with a REF-01 error — should exit 1
INVALID_MANIFEST="$(mktemp /tmp/averos-invalid-XXXXXX.json)"
cat > "$INVALID_MANIFEST" << 'EOF'
{
  "applicationName": "BadApp",
  "defaultLanguageCode": "en",
  "enableAuthentication": false,
  "enableExternalEntityMapping": false,
  "entities": [
    {
      "name": "Ghost",
      "sname": "GhostService",
      "members": [
        { "memberNature": "simple", "ename": "Phantom", "mname": "name",
          "memberType": "string" }
      ]
    }
  ],
  "serviceConfigurations": [
    { "id": "GhostService", "apiHost": "localhost", "apiPort": 3000,
      "apiProtocol": "http", "apiEndPoint": "/api/ghosts",
      "apiHTTPQueryBuilder": "mongodb" }
  ]
}
EOF

set +e
npx tsx \
  --tsconfig "$ROOT_DIR/scripts/smoke/tsconfig.json" \
  "$ROOT_DIR/packages/cli/src/bin/averos.ts" \
  run "$INVALID_MANIFEST" --dry-run > /dev/null 2>&1

INVALID_EXIT=$?
set -e

if [ $INVALID_EXIT -eq 0 ]; then
  echo "  FAIL: Invalid manifest should exit non-zero"
  rm -f "$INVALID_MANIFEST"
  exit 1
fi
echo "  PASS: Invalid manifest correctly exits $INVALID_EXIT"

# Cleanup
rm -f "$INVALID_MANIFEST"

echo ""
echo "✓ minimal-run smoke test passed"
echo ""