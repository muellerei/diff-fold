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
python3 docs/src/check.py
sh docs/src/build.sh && git diff --exit-code -- docs
```

`tsc` checks against the types Claude Code writes to `.claude-plugin/types/` when it loads the mod. They follow the Claude Code that
wrote them, so lay them down again after an update. They are never committed.

## Debugging

When a diff is not folded as expected, start Claude Code with `--debug-file <path>` and look for lines starting with
`diff-fold:`. Each says, per result of Edit, Write, NotebookEdit or Bash, whether it was folded or drawn in full and why, with the
`isExpanded` and fullscreen values the decision turned on. Without a debug log the lines go nowhere. A render can run more than once
per result (a scroll, a resize), so the same line may repeat.

A Bash call that changed files but left no line usually came without `bashEditDiff`: Claude Code records the changed files only
when `bashEditDiffEnabled` is on (see the README) and the command runs inside a git repository (measured, Claude Code 2.1.316).
Without them the hook was not called for the call at all (measured, Claude Code 2.1.314).

## Tests

Pure modules have a test file each (`paths.test.ts`, `counts.test.ts`, `summary.test.ts`, `config.test.ts`). `register.test.tsx`
mounts `ToolResult` against a fake host that draws every result as `full diff`, so a test sees whether the mod drew the line or left
it to the engine. Tool results for the tests are built in `test-support.ts`.

A test for a fix has to fall without the fix: take the fix out, run `claude plugin test .`, and see the test fail.

## Pictures

The banner and `docs/images/fold.svg` are built by the Python scripts in `docs/src/` (Python 3, nothing to install):
`sh docs/src/build.sh`. Change the script, not the SVG, and look at the result in a browser, since the banner moves. The values a
picture shows (the default of `smallDiffLines`, the icon) are constants in `docs/src/common.py`; `check.py` compares them with
`plugin.json`, `config.ts`, the README and the workflow, and checks that the example edit in `fold.svg` is large enough to be folded.

The listing icon, `.claude-plugin/icon.png`, comes from `python3 docs/src/icon.py`, which needs Pillow. It is not part of
`build.sh`: the developer portal takes the icon only at the first submission, and Pillow's output differs between versions, so CI
does not compare it.

The social preview, `docs/images/social-preview.png` (1280x640, uploaded under the repository's settings), is the picture
`python3 docs/src/banner.py --social` writes to `social-preview.svg`, rendered with a headless browser:
`chrome --headless --window-size=1280,640 --screenshot=docs/images/social-preview.png file://$PWD/docs/images/social-preview.svg`.
