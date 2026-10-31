# Working on diff-fold

## Running it from a clone

```bash
claude --plugin-dir .
```

## Checks

`check.sh` runs every check, the same script the CI runs on every push and pull request and once a week
(`.github/workflows/check.yml`):

```bash
sh check.sh
```

It starts Claude Code once to lay down the types `tsc` needs, with `-p /exit` and no tools or user settings. A prompt the model
answers would start a full session that picks up open to-do lists and acts on them in the clone.

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

## Releasing

The CHANGELOG decides the version; everything else follows it.

1. Pick the version from what sits under `[Unreleased]`: before 1.0, anything under Added or Changed raises the minor
   version (0.1.0 to 0.2.0), fixes alone the patch version.
2. On a branch, add `## [x.y.z] - YYYY-MM-DD` right under `## [Unreleased]`, so Unreleased stays as an empty section on
   top, and set `version` in `.claude-plugin/plugin.json` to the same number. `check.py` fails while the two differ.
3. Commit as `Release x.y.z`, open a pull request and merge it once CI is green.
4. Tag the merge commit on `main` with a signed, annotated tag and push it:
   `git tag -s vx.y.z -m "diff-fold x.y.z" && git push origin vx.y.z`.
5. Create the GitHub release from the tag, titled `vx.y.z`, with the version's CHANGELOG section as its text. The
   CHANGELOG wraps its points; the release text has each point on one line:

   ```bash
   V=x.y.z
   awk -v v="$V" '/^## \[/ {f = index($0, "[" v "]"); next} f && /^  / {sub(/^ +/, " "); printf "%s", $0; next} f {printf "%s%s", (n++ ? "\n" : ""), $0} END {print ""}' CHANGELOG.md |
     gh release create "v$V" --title "v$V" --notes-file - --verify-tag
   ```
