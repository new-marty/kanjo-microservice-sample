#!/bin/bash
# Stop hook: block if there's unshipped work on a feature branch
INPUT=$(cat)
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')

if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$BRANCH" = "main" ]; then
  exit 0
fi

HAS_UNCOMMITTED=false
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  HAS_UNCOMMITTED=true
fi

AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")

if [ "$HAS_UNCOMMITTED" = "true" ] || [ "$AHEAD" -gt 0 ]; then
  jq -n '{
    "decision": "block",
    "reason": "You have unshipped work on this feature branch. Commit any remaining changes and run `task ship` to merge to main."
  }'
  exit 0
fi

exit 0
