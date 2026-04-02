#!/bin/bash
# SessionStart hook: pull latest main and enforce branch isolation for multi-agent work

cd "$CLAUDE_PROJECT_DIR" || exit 0

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

if [ "$CURRENT_BRANCH" = "main" ]; then
  git pull origin main --ff-only 2>/dev/null
  echo "On main with latest code pulled. Create a feature branch before starting work (e.g. git checkout -b feature/your-feature)."
  echo "Do NOT commit directly to main."
elif ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  # Dirty feature branch — likely another agent's work
  echo "WARNING: Branch '$CURRENT_BRANCH' has uncommitted changes (likely another agent's work)."
  echo "Create your own branch from main:"
  echo "  git checkout main && git pull origin main && git checkout -b feature/your-feature"
else
  # Clean feature branch — this agent owns it
  git fetch origin main 2>/dev/null
  echo "On branch '$CURRENT_BRANCH' (clean). Latest main fetched."
fi

exit 0
