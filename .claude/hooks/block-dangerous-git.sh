#!/bin/bash
# Claude Code PreToolUse guardrail: blocks destructive git commands.
# Feature-branch pushes are allowed (PRs need them); main is only changed by a human merge.
# Patterns match the subcommand anywhere, so global options like `git -C <dir>` cannot slip past.

block() {
  echo "BLOCKED: '$COMMAND' $1. Only the user can do this." >&2
  exit 2
}

if ! command -v jq >/dev/null; then
  COMMAND="(unparsed)"
  block "could not be checked because jq is missing"
fi
COMMAND=$(jq -r '.tool_input.command')

DANGEROUS_PATTERNS=(
  "reset .*--hard"
  "clean .*(-[a-zA-Z]*f|--force)"
  "branch .*(-D|--force)"
  "checkout .*\.( |$)"
  "restore .*\.( |$)"
  "push .*(--force|-f( |$)|--mirror|--delete|-d( |$)| \+[^ ]+| :[^ ]+)"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "git .*$pattern"; then
    block "matches dangerous pattern '$pattern'"
  fi
done

if echo "$COMMAND" | grep -qE "git .*push"; then
  if echo "$COMMAND" | grep -qE "push.*[ :](main|master)( |$)"; then
    block "pushes to main"
  fi
  BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)
  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    block "pushes while on main"
  fi
fi

exit 0
