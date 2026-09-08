#!/usr/bin/env bash
# Scan the repo for anything that looks like a secret or a personal identifier before you commit or share.
# Exit code 1 if anything is found. Run it as a pre-commit hook:  ln -s ../../setup/check-secrets.sh .git/hooks/pre-commit
set -uo pipefail
cd "$(dirname "$0")/.."

PATTERNS=(
  'xoxb-[A-Za-z0-9-]{10,}'            # Slack bot token
  'xapp-[A-Za-z0-9-]{10,}'            # Slack app token
  'ntn_[A-Za-z0-9]{20,}'              # Notion token (new)
  'secret_[A-Za-z0-9]{20,}'           # Notion token (old)
  'EAA[A-Za-z0-9]{40,}'               # Meta access token
  'sk-[A-Za-z0-9_-]{20,}'             # OpenAI / Anthropic style keys
  'sk-ant-[A-Za-z0-9_-]{20,}'
  'AIza[0-9A-Za-z_-]{30,}'            # Google API key
  'GOCSPX-[0-9A-Za-z_-]{20,}'         # Google OAuth client secret
  '1//0[A-Za-z0-9_-]{40,}'            # Google refresh token
  'pit-[0-9a-f]{8}-[0-9a-f-]{20,}'    # GoHighLevel private integration token
  'eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}'   # JWT
  'AKIA[0-9A-Z]{16}'                  # AWS access key
  'r2\.cloudflarestorage\.com/[a-z0-9]{32}'
  'apify_api_[A-Za-z0-9]{20,}'
  'Bearer [A-Za-z0-9._-]{30,}'
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
)

found=0
for p in "${PATTERNS[@]}"; do
  hits=$(grep -rInE "$p" --exclude-dir=node_modules --exclude-dir=.git --exclude='check-secrets.sh' --exclude='*.png' --exclude='*.ttf' --exclude='*.mp4' --exclude='*.mp3' . 2>/dev/null | head -5 || true)
  if [[ -n "$hits" ]]; then
    echo "⚠️  possible secret ($p):"; echo "$hits" | cut -c1-160; found=1
  fi
done

# .env files must never be tracked
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked_env=$(git ls-files | grep -E '(^|/)\.env(\..*)?$' | grep -v '\.example$' || true)
  [[ -n "$tracked_env" ]] && { echo "⚠️  .env file tracked by git: $tracked_env"; found=1; }
fi

if [[ $found -eq 0 ]]; then echo "✅ no secrets found"; fi
exit $found
