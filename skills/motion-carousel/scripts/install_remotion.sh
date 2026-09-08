#!/usr/bin/env bash
# One-time bootstrap: installs the Remotion project inside the skill.
# Re-run after a Remotion version bump.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTION_DIR="$SKILL_DIR/remotion"

if [ ! -d "$REMOTION_DIR" ]; then
  echo "remotion/ directory missing at $REMOTION_DIR"
  exit 1
fi

cd "$REMOTION_DIR"

NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Remotion 4.x requires Node 18+. Current: $(node -v 2>/dev/null || echo 'none')"
  exit 1
fi

echo "Installing Remotion dependencies in $REMOTION_DIR..."
npm install

echo ""
echo "Done. Verify with:"
echo "  cd '$REMOTION_DIR' && npx remotion studio src/index.ts"
