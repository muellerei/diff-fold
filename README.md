# diff-fold

A Claude Code mod that shows one summary line per file instead of the diff under a finished edit.
A long diff pushes the conversation out of view, and once the edit is done you rarely read it there:

```
🔶 Changed src/api/index.ts:42 (+12 −3)
```

The path is relative to the project, the number after the colon is the first changed line, and the counts are green and red.
Small diffs, diffs held for your review and failed edits stay in full.
To see a folded diff, press ctrl+o: the expanded transcript shows every diff in full.

## What it folds

| Tool                                                       | Summary                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Edit                                                       | `Changed <path>:<line> (+N −M)`                                                       |
| Write, new file                                            | `Created <path> (+N −0)`                                                              |
| Write, existing file                                       | `Changed <path>:<line> (+N −M)`                                                       |
| NotebookEdit                                               | `Changed <notebook> cell <id> (+N −M)`                                                |
| Bash that changed files (`sed -i`, a heredoc, a generator) | the command's own output, then one line per file, up to three, and `and N more files` |

A Bash call that changed five files ends like this:

```text
🔶 Changed src/a.ts:12 (+8 −8)
🔶 Created src/b.ts (+40 −0)
🔶 Deleted src/c.ts (+0 −22)
🔶 and 2 more files
```

Which files a command changed comes from Claude Code itself, which attaches a diff of them to the Bash result. A command
without that diff, or one Claude Code skipped, keeps its output as it is.

Left in full:

- a change of `smallDiffLines` lines or fewer (5 by default)
- an edit or write that is only proposed and not yet written to disk: the diff is what you have to judge
- a failed call
- everything while the transcript is expanded (ctrl+o, `--verbose`)

There is no line above the prompt and no key binding to set up.

## Switching

`/diff-fold` switches between summaries and full diffs and says which is on. The choice is kept across sessions.

## Settings

In `/config`, under the mod:

| Setting          | Default |                                                                                      |
| ---------------- | ------- | ------------------------------------------------------------------------------------ |
| `smallDiffLines` | `5`     | Diffs with this many changed lines or fewer are shown in full. `0` folds every diff. |
| `icon`           | `🔶`    | The mark at the start of each summary line. Empty for none.                          |

## Install

From a clone:

```bash
claude --plugin-dir /path/to/diff-fold
```

Tested with Claude Code 2.1.314.

## Other mods

diff-fold draws only the result block under Edit, Write, NotebookEdit and file-changing Bash calls. It leaves tool rows, grouped
rows and the area above the prompt alone.

A mod that also shortens Write results (shellcast does) meets diff-fold there. Nothing breaks: whichever of the two comes first in
the chain draws the line you see.

## Credits

diff-fold is derived from [hide-diffs](https://github.com/gixxy22/hide-diffs) by gixxy22 (MIT): the summary line, its counting
rules and the small-diff threshold come from there. See [NOTICE](NOTICE).

## License

MIT, see [LICENSE](LICENSE).
