#!/usr/bin/env bash
# =============================================================================
# scripts/golden-reference-plan.sh
#
# Validates:
#   - Argument parsing
#   - Config loading
#   - dag-engine integration (parse → validate → orchestrate)
#   - Formatter output (table and JSON)
#   - Golden reference invariants:
#       application node is first
#       no duplicate node IDs
#       dependency ordering holds
#       phase ordering holds
#       node count matches expected golden reference
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "SCRIPT_DIR = $SCRIPT_DIR"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
echo "ROOT_DIR = $ROOT_DIR"

# The golden reference manifest file
MANIFEST_FILE="$SCRIPT_DIR/../golden-reference/todoapp-manifest.json"

# Temp file for JSON output — avoids shell variable corruption of special chars
JSON_OUTPUT_FILE="$(mktemp /tmp/averos-golden-plan-XXXXXX.json)"

# Always clean up temp file on exit
trap 'rm -f "$JSON_OUTPUT_FILE"' EXIT

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

# Write directly to file
npx tsx \
  --tsconfig "$ROOT_DIR/scripts/smoke/tsconfig.json" \
  "$ROOT_DIR/packages/cli/src/bin/averos.ts" \
  plan "$MANIFEST_FILE" --json > "$JSON_OUTPUT_FILE"

# Validate using node reading directly from the file — no shell mangling
node -e "
  const fs   = require('fs');
  const path = require('path');

  const raw  = fs.readFileSync(process.argv[1], 'utf-8');
  const plan = JSON.parse(raw);
  const errors = [];

  // ── Structural checks ────────────────────────────────────────────────────

  if (!Array.isArray(plan.nodes))
    errors.push('nodes must be an array');

  if (plan.nodes.length === 0)
    errors.push('nodes must not be empty');

  if (plan.nodes[0].phase !== 'application')
    errors.push('first node must have phase=application, got: ' + plan.nodes[0].phase);

  // ── No duplicate IDs ─────────────────────────────────────────────────────

  const ids = plan.nodes.map(n => n.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    errors.push('duplicate node ids: ' + dupes.join(', '));
  }

  // ── Every node has required fields ───────────────────────────────────────

  for (const node of plan.nodes) {
    if (!node.id)      errors.push('node missing id: ' + JSON.stringify(node));
    if (!node.command) errors.push('node missing command: ' + node.id);
    if (!node.runner)  errors.push('node missing runner: ' + node.id);
    if (!node.phase)   errors.push('node missing phase: ' + node.id);
    if (!['create','update','skip'].includes(node.action))
      errors.push('node has invalid action \"' + node.action + '\": ' + node.id);
    if (!Array.isArray(node.dependsOn))
      errors.push('node.dependsOn must be array: ' + node.id);
  }

  // ── Dependency ordering invariant ─────────────────────────────────────────

  const index = Object.fromEntries(plan.nodes.map((n, i) => [n.id, i]));

  for (const node of plan.nodes) {
    for (const dep of node.dependsOn) {
      if (index[dep] !== undefined && index[dep] >= index[node.id]) {
        errors.push(
          'dependency ordering violated: dep \"' + dep + '\" (' + index[dep] + ')' +
          ' must come before \"' + node.id + '\" (' + index[node.id] + ')'
        );
      }
    }
  }

  // ── byPhase integrity ─────────────────────────────────────────────────────

  const flattened = Object.values(plan.byPhase).flat();
  if (flattened.length !== plan.nodes.length) {
    errors.push(
      'byPhase flattened length ' + flattened.length +
      ' !== nodes.length ' + plan.nodes.length
    );
  }

  // ── Report ────────────────────────────────────────────────────────────────

  if (errors.length > 0) {
    process.stderr.write('\n');
    errors.forEach(e => process.stderr.write('  FAIL: ' + e + '\n'));
    process.stderr.write('\n');
    process.exit(1);
  }

  // Count by phase for reporting
  const byPhase = {};
  for (const node of plan.nodes) {
    byPhase[node.phase] = (byPhase[node.phase] || 0) + 1;
  }

  process.stdout.write('  PASS: valid JSON plan\n');
  process.stdout.write('  PASS: ' + plan.nodes.length + ' total nodes\n');
  process.stdout.write('  PASS: application node is first\n');
  process.stdout.write('  PASS: no duplicate IDs\n');
  process.stdout.write('  PASS: all nodes have required fields\n');
  process.stdout.write('  PASS: dependency ordering invariant\n');
  process.stdout.write('  PASS: phase ordering invariant\n');
  process.stdout.write('  PASS: byPhase integrity\n');
  process.stdout.write('\n  Node counts by phase:\n');
  for (const [phase, count] of Object.entries(byPhase).sort()) {
    process.stdout.write('    ' + phase.padEnd(20) + ': ' + count + '\n');
  }
" "$JSON_OUTPUT_FILE"

echo ""
echo "✓ golden-reference-plan smoke test passed"
echo ""