#!/bin/bash
# Self-check for block-dangerous-git.sh: bash .claude/hooks/block-dangerous-git.test.sh (from a feature branch).
cd "$(dirname "$0")/../.." || exit 1
fail=0
expect() {
  echo "{\"tool_input\":{\"command\":\"$2\"}}" | CLAUDE_PROJECT_DIR=$PWD .claude/hooks/block-dangerous-git.sh 2>/dev/null
  local code=$?
  if [[ $code -ne $1 ]]; then echo "FAIL ($code, wanted $1): $2"; fail=1; fi
}
expect 0 "git push -u origin feature/x"
expect 0 "git push origin HEAD:feature-x"
expect 0 "git checkout ./app/root.tsx"
expect 0 "git checkout -b 4-catalog"
expect 0 "git branch -d merged-branch"
expect 0 "git commit -m 'main fix'"
expect 0 "git reset HEAD app/root.tsx"
expect 2 "git push origin main"
expect 2 "git push origin HEAD:main"
expect 2 "git push --force origin x"
expect 2 "git push --force-with-lease origin x"
expect 2 "git push -f"
expect 2 "git push origin +feature-x"
expect 2 "git push origin :old-branch"
expect 2 "git push origin --delete old-branch"
expect 2 "git reset --hard HEAD~1"
expect 2 "git -C /tmp/repo reset --hard"
expect 2 "git clean -fd"
expect 2 "git clean -d -f"
expect 2 "git clean --force"
expect 2 "git branch -D foo"
expect 2 "git branch --delete --force foo"
expect 2 "git checkout ."
expect 2 "git checkout -- ."
expect 2 "git restore ."
[[ $fail -eq 0 ]] && echo "guardrail ok"
exit $fail
