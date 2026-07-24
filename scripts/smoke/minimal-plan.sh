#!/usr/bin/env bash
# =============================================================================
# scripts/minimal-plan.sh
#
# Validates:
#   - Argument parsing
#   - Config loading
#   - dag-engine integration (parse → validate → orchestrate)
#   - Formatter output (table and JSON)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# A manifest with real content — not just an empty entity list
MANIFEST_FILE="$(mktemp /tmp/averos-plan-smoke-XXXXXX.json)"

cat > "$MANIFEST_FILE" << 'EOF'
{
  "applicationName": "PlanSmokeApp",
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
echo "── averos plan (table output) ──────────────────────"
echo ""

npx tsx \
  --tsconfig "$ROOT_DIR/scripts/smoke/tsconfig.json" \
  "$ROOT_DIR/packages/cli/src/bin/averos.ts" \
  plan "$MANIFEST_FILE"

echo ""
echo "── averos plan --json (JSON output) ────────────────"
echo ""

JSON_OUTPUT=$(
  npx tsx \
    --tsconfig "$ROOT_DIR/scripts/smoke/tsconfig.json" \
    "$ROOT_DIR/packages/cli/src/bin/averos.ts" \
    plan "$MANIFEST_FILE" --json
)

# Assert the output is valid JSON
echo "$JSON_OUTPUT" | node -e "
  const raw = require('fs').readFileSync('/dev/stdin', 'utf-8');
  const plan = JSON.parse(raw);
  const errors = [];

  if (!Array.isArray(plan.nodes)) errors.push('nodes must be array');
  if (plan.nodes.length === 0)    errors.push('nodes must not be empty');
  if (plan.nodes[0].phase !== 'application') errors.push('first node must be application');

  const ids = plan.nodes.map(n => n.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate node ids detected');

  const index = Object.fromEntries(plan.nodes.map((n, i) => [n.id, i]));
  for (const node of plan.nodes) {
    for (const dep of node.dependsOn) {
      if (index[dep] !== undefined && index[dep] >= index[node.id]) {
        errors.push('dependency ordering violated for ' + node.id);
      }
    }
  }

  if (errors.length > 0) {
    errors.forEach(e => process.stderr.write('  FAIL: ' + e + '\n'));
    process.exit(1);
  }

  process.stdout.write('  PASS: valid JSON plan\n');
  process.stdout.write('  PASS: ' + plan.nodes.length + ' nodes\n');
  process.stdout.write('  PASS: application node is first\n');
  process.stdout.write('  PASS: no duplicate IDs\n');
  process.stdout.write('  PASS: dependency ordering invariant\n');
"

# Cleanup
rm -f "$MANIFEST_FILE"

echo ""
echo "✓ minimal-plan smoke test passed"
echo ""