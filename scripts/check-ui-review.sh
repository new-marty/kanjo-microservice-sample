#!/bin/bash
# Check if a UI review is overdue based on frontend commits since last review.
# Called by ship.sh for branches touching apps/web/.

set -euo pipefail

if [ "${SKIP_UI_REVIEW:-}" = "1" ]; then
  exit 0
fi

# Only check if this branch touches frontend code
CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
if ! echo "$CHANGED_FILES" | grep -q "^apps/web/"; then
  exit 0
fi

# Count frontend-related commits on main since last [ui-review] commit
LAST_REVIEW=$(git log origin/main --all-match --grep="\[ui-review\]" --format="%H" -1 2>/dev/null || true)

if [ -z "$LAST_REVIEW" ]; then
  # No review ever done — count all frontend commits
  FRONTEND_COMMITS=$(git log origin/main --format="%s" | grep -c -E "apps/web|feat\(web\)|fix\(web\)|style\(web\)" || echo "0")
else
  FRONTEND_COMMITS=$(git log "$LAST_REVIEW"..origin/main --format="%s" | grep -c -E "apps/web|feat\(web\)|fix\(web\)|style\(web\)" || echo "0")
fi

THRESHOLD=3

if [ "$FRONTEND_COMMITS" -ge "$THRESHOLD" ]; then
  echo ""
  echo "=========================================="
  echo "  UI REVIEW RECOMMENDED"
  echo "=========================================="
  echo ""
  echo "  $FRONTEND_COMMITS frontend changes since last UI review."
  echo "  Run: /check-ui (follows docs/reviews/ui-review-prompt.md)"
  echo ""
  echo "  Skip with: SKIP_UI_REVIEW=1 task ship"
  echo "=========================================="
  echo ""
fi
