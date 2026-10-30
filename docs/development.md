# Working on diff-fold

## Running it from a clone

```bash
claude --plugin-dir .
```

## Checks

The CI runs these on every push and pull request and once a week (`.github/workflows/check.yml`):

```bash
claude plugin validate . --strict
claude plugin test .
CLAUDE_CODE_PLUGIN_DIR_WATCH=1 claude --plugin-dir . -p ok   # lays down the types tsc needs
npx -p typescript@5 tsc -p .
npx prettier@3 --check hooks types docs
```

`tsc` checks against the types Claude Code writes to `.claude-plugin/types/` when it loads the mod. They follow the Claude Code that
wrote them, so lay them down again after an update. They are never committed.

## Tests

Pure modules have a test file each (`paths.test.ts`, `counts.test.ts`, `summary.test.ts`, `config.test.ts`). `register.test.tsx`
mounts `ToolResult` against a fake host that draws every result as `full diff`, so a test sees whether the mod drew the line or left
it to the engine. Tool results for the tests are built in `test-support.ts`.

A test for a fix has to fall without the fix: take the fix out, run `claude plugin test .`, and see the test fail.
