#!/bin/bash
set -euo pipefail

# Ensure task (go-task) is on PATH
export PATH="$HOME/go/bin:$PATH"

BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "main" ]; then
  echo "Error: Cannot ship from main. Create a feature branch first."
  exit 1
fi

# 1. Sync with latest main
echo "==> Rebasing onto main..."
git fetch origin main
git rebase origin/main || {
  echo "Error: Rebase conflicts. Resolve them, then run 'task ship' again."
  exit 1
}

# 2. Format everything
echo "==> Formatting..."
task format

# 3. Auto-commit formatting changes if any
if ! git diff --quiet; then
  git add -A
  git commit --no-verify -m "style: auto-format

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
fi

# 4. Check if UI review is overdue (warning only)
bash scripts/check-ui-review.sh

# 5. Run all checks (lint + typecheck + test + knip + go checks)
echo "==> Running checks..."
task check

# 6. Push
echo "==> Pushing branch..."
git push -u origin "$BRANCH" --force-with-lease

# 7. Create PR (idempotent — skips if already exists)
echo "==> Creating PR..."
gh pr create --fill 2>/dev/null || true
PR_URL=$(gh pr view --json url -q .url)
echo "PR: $PR_URL"

# 8. Merge
echo "==> Merging PR..."
gh pr merge --squash --delete-branch

# 9. Return to main
echo "==> Switching to main..."
git checkout main
git pull origin main
git branch -d "$BRANCH" 2>/dev/null || true

echo "==> Shipped $BRANCH to main."
