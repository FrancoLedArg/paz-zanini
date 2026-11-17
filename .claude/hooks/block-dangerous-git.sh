#!/bin/bash
# Claude Code PreToolUse guardrail: blocks destructive git commands.
# Feature-branch pushes are allowed (PRs need them); main is only changed by a human merge.

COMMAND=$(jq -r '.tool_input.command')

block() {
  echo "BLOCKED: '$COMMAND' $1. Only the user can do this." >&2
  exit 2
}

DANGEROUS_PATTERNS=(
  "git reset --hard"
  "git clean -[a-zA-Z]*f"
  "git branch -D"
  "git checkout \.( |$)"
  "git restore \.( |$)"
  "git push .*(--force|-f( |$)|--force-with-lease|--mirror|--delete|:[^ ]*( |$))"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    block "matches dangerous pattern '$pattern'"
  fi
done

if echo "$COMMAND" | grep -qE "git push"; then
  if echo "$COMMAND" | grep -qE "git push.*[ :](main|master)( |$)"; then
    block "pushes to main"
  fi
  BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)
  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    block "pushes while on main"
  fi
fi

exit 0
