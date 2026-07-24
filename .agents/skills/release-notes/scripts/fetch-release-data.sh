#!/usr/bin/env bash
set -euo pipefail

NEW_TAG="${1:-}"
PREV_TAG="${2:-}"
REPO="${GITHUB_REPO:-opentiny/genui-sdk}"

if [[ -z "$NEW_TAG" || -z "$PREV_TAG" ]]; then
  echo "Usage: fetch-release-data.sh <new_tag> <previous_tag>" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo '{"error":"gh CLI not found. Install: https://cli.github.com/"}' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo '{"error":"gh not authenticated. Run: gh auth login"}' >&2
  exit 1
fi

NOTES=""
if NOTES=$(gh api "repos/${REPO}/releases/generate-notes" \
  -f "tag_name=${NEW_TAG}" \
  -f "previous_tag_name=${PREV_TAG}" \
  --jq '.body' 2>/dev/null); then
  :
else
  NOTES=""
fi

PR_NUMBERS=$(git log "${PREV_TAG}..${NEW_TAG}" --merges --pretty=format:'%s' \
  | grep -oE '#[0-9]+' | tr -d '#' | sort -un || true)

PRS='[]'
if [[ -n "$PR_NUMBERS" ]]; then
  PRS='['
  FIRST=true
  for NUM in $PR_NUMBERS; do
    PR_JSON=$(gh pr view "$NUM" --repo "$REPO" --json number,title,author,url,commits,files 2>/dev/null) || continue
    if $FIRST; then FIRST=false; else PRS+=','; fi
    PRS+="$PR_JSON"
  done
  PRS+=']'
fi

NEW_TAG="$NEW_TAG" PREV_TAG="$PREV_TAG" NOTES="$NOTES" PRS="$PRS" python3 -c '
import json, os
print(json.dumps({
  "new_tag": os.environ["NEW_TAG"],
  "previous_tag": os.environ["PREV_TAG"],
  "github_notes": os.environ["NOTES"],
  "pull_requests": json.loads(os.environ["PRS"]),
}, ensure_ascii=False))
'
