#!/usr/bin/env bash
# Fill every [PLACEHOLDER] in this repo with your own values.
# Safe to re-run: it only touches text files and asks before writing.
# Usage:  ./setup/configure.sh            (interactive)
#         ./setup/configure.sh --dry-run  (show what would change)
set -euo pipefail
cd "$(dirname "$0")/.."

DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1

ask() { # var prompt default
  local v="$1" p="$2" d="${3:-}"
  local cur="${!v:-$d}"
  read -r -p "$p [${cur}]: " ans || true
  printf -v "$v" '%s' "${ans:-$cur}"
}

echo "== Content system configuration =="
echo "Leave a value empty to keep the placeholder (you can re-run later)."
echo

# --- identity ---
ask YOUR_NAME       "Your full name (as used in copy)"            "Alex Example"
ask BRAND           "Brand / company name"                        "ACME Systems"
ask BRAND_SLUG      "Brand slug (lowercase, no spaces)"           "$(echo "$BRAND" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')"
ask YOUR_EMAIL      "Your email"                                  "you@example.com"
ask IG_HANDLE       "Instagram handle (no @)"                     "your.handle"
ask YT_HANDLE       "YouTube handle (no @)"                       "yourhandle"
ask WEBSITE_DOMAIN  "Website domain (no https://)"                "example.com"
ask YOUR_OFFER      "Your offer / mechanism name (e.g. 'Growth OS')" "Growth OS"
ask YOUR_CALL_NAME  "Name of your free call (e.g. 'Systems Call')" "Strategy Call"
ask ICP_QUALIFIER   "ICP qualifier phrase (e.g. '\$100k+/mo')"    "\$100k+/mo"
ask YOUR_EXPERTISE  "Your expertise in 3-6 words"                 "data & AI systems"
ask TIMEZONE        "IANA timezone"                               "Europe/London"

# --- local paths ---
ask CONTENT_ROOT            "Absolute path to your Marketing/content folder"     "$HOME/Marketing"
ask EDITING_WORKFLOW_ROOT   "Absolute path to the editing-workflow checkout"     "$(pwd)/editing-workflow"
ask WORKSPACE_ROOT          "Absolute path to your workspace root"               "$(dirname "$CONTENT_ROOT")"

# --- Notion ---
ask NOTION_PARENT_PAGE_ID          "Notion parent page id (where the DBs live)" ""
ask NOTION_CPP_DB_ID               "Content Production Pipeline database id"    ""
ask NOTION_CPP_DATA_SOURCE_ID      "Content Production Pipeline data source id" ""
ask NOTION_IG_MY_CONTENT_DB_ID     "IG My Content database id"                  ""
ask NOTION_YT_MY_CONTENT_DB_ID     "YT My Content database id"                  ""
ask NOTION_COMMENTS_CONFIG_DB_ID   "Comments to DM Config database id"          ""

# --- n8n / platforms ---
ask N8N_HOST                       "n8n host (no https://)"                      "n8n.example.com"
ask N8N_WF_AUTOPOSTER_ID           "n8n workflow id: Auto-Poster (after import)" ""
ask N8N_WF_STORY_AUTOPOSTER_ID     "n8n workflow id: Story Auto-Poster"          ""
ask N8N_WF_COMMENT_DM_ID           "n8n workflow id: IG Comment → DM"            ""
ask IG_ACCOUNT_ID                  "Instagram business account id (1784...)"     ""
ask YT_CHANNEL_ID                  "YouTube channel id (UC...)"                  ""
ask S3_BUCKET                      "S3 / R2 bucket name"                         "content-media"
ask S3_PUBLIC_HOST                 "Public host of the bucket (pub-xxx.r2.dev)"  ""
ask SLACK_CHANNEL_ID               "Slack channel id for notifications"          ""
ask GHL_LOCATION_ID                "GoHighLevel location id (comment-to-DM only)" ""

declare -A MAP=(
  [YOUR_NAME]="$YOUR_NAME" [BRAND]="$BRAND" [BRAND_SLUG]="$BRAND_SLUG" [YOUR_EMAIL]="$YOUR_EMAIL"
  [IG_HANDLE]="$IG_HANDLE" [YT_HANDLE]="$YT_HANDLE" [WEBSITE_DOMAIN]="$WEBSITE_DOMAIN"
  [YOUR_OFFER]="$YOUR_OFFER" [YOUR_CALL_NAME]="$YOUR_CALL_NAME" [ICP_QUALIFIER]="$ICP_QUALIFIER"
  [YOUR_EXPERTISE]="$YOUR_EXPERTISE" [TIMEZONE]="$TIMEZONE"
  [CONTENT_ROOT]="$CONTENT_ROOT" [EDITING_WORKFLOW_ROOT]="$EDITING_WORKFLOW_ROOT" [WORKSPACE_ROOT]="$WORKSPACE_ROOT"
  [NOTION_PARENT_PAGE_ID]="$NOTION_PARENT_PAGE_ID" [NOTION_CPP_DB_ID]="$NOTION_CPP_DB_ID"
  [NOTION_CPP_DATA_SOURCE_ID]="$NOTION_CPP_DATA_SOURCE_ID" [NOTION_IG_MY_CONTENT_DB_ID]="$NOTION_IG_MY_CONTENT_DB_ID"
  [NOTION_YT_MY_CONTENT_DB_ID]="$NOTION_YT_MY_CONTENT_DB_ID" [NOTION_COMMENTS_CONFIG_DB_ID]="$NOTION_COMMENTS_CONFIG_DB_ID"
  [N8N_HOST]="$N8N_HOST" [N8N_WF_AUTOPOSTER_ID]="$N8N_WF_AUTOPOSTER_ID" [N8N_WF_STORY_AUTOPOSTER_ID]="$N8N_WF_STORY_AUTOPOSTER_ID"
  [N8N_WF_COMMENT_DM_ID]="$N8N_WF_COMMENT_DM_ID" [IG_ACCOUNT_ID]="$IG_ACCOUNT_ID" [YT_CHANNEL_ID]="$YT_CHANNEL_ID"
  [S3_BUCKET]="$S3_BUCKET" [S3_PUBLIC_HOST]="$S3_PUBLIC_HOST" [SLACK_CHANNEL_ID]="$SLACK_CHANNEL_ID" [GHL_LOCATION_ID]="$GHL_LOCATION_ID"
)

# lowercase twins used inside code/prose
MAP[your_name]="$(echo "$YOUR_NAME" | tr '[:upper:]' '[:lower:]')"
MAP[your_offer]="$(echo "$YOUR_OFFER" | tr '[:upper:]' '[:lower:]')"

FILES=$(grep -rlE '\[[A-Z_]{3,}\]' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=setup --exclude='*.png' --exclude='*.ttf' --exclude='*.mp4' . || true)
[[ -z "$FILES" ]] && { echo "Nothing to replace."; exit 0; }

count=0
for f in $FILES; do
  tmp="$(mktemp)"; cp "$f" "$tmp"
  for k in "${!MAP[@]}"; do
    v="${MAP[$k]}"; [[ -z "$v" ]] && continue
    # escape for sed
    ev=$(printf '%s' "$v" | sed -e 's/[\/&|]/\\&/g')
    sed -i '' "s|\[$k\]|$ev|g" "$tmp"
  done
  if ! cmp -s "$f" "$tmp"; then
    count=$((count+1))
    if [[ $DRY -eq 1 ]]; then echo "would change: $f"; else cp "$tmp" "$f"; fi
  fi
  rm -f "$tmp"
done
echo
echo "$count files $( [[ $DRY -eq 1 ]] && echo 'would be' || echo 'were' ) updated."
echo "Remaining placeholders (fill later or by hand):"
grep -rhoE '\[[A-Z_]{3,}\]' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=setup . | sort | uniq -c | sort -rn | head -40 || true
