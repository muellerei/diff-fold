#!/bin/sh
# Every check the CI runs, in the same order. Run it from the repository root: sh check.sh
set -eu

claude plugin validate . --strict
claude plugin test .

# Claude Code lays down .claude-plugin/types/ only while it watches plugin folders, so start it once.
# A plain `claude -p ok` here is a full agent session: it loads the user's hooks and open to-do lists,
# takes them as its task and commits on the branch. `/exit` is handled without a model call, so no
# session starts and none is saved; no tools and no user settings in case that ever changes.
CLAUDE_CODE_PLUGIN_DIR_WATCH=1 claude --plugin-dir . --setting-sources "" --strict-mcp-config \
  --tools "" --no-session-persistence -p /exit < /dev/null > /dev/null
npx -p typescript@5 tsc -p .

npx prettier@3 --check hooks types docs
python3 docs/src/check.py
sh docs/src/build.sh && git diff --exit-code -- docs
echo "all checks passed"
