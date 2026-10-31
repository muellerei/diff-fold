# How diff-fold is built

A map for reading the code. The reasons stay in the comments at the places named here.

## Modules

Only `hooks/register.tsx` talks to the host. Everything that judges, counts or formats is a pure module with no `$`, tested without a
session:

| Module         | Does                                                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summary.ts`   | `summarize`: from a tool's result to the lines that replace its diff, or why the diff stays in full (the reason the debug log names). All rules about what is folded live here; whether a row is open is the host's state, in `register.tsx`. |
| `counts.ts`    | Lines added and removed, the first changed line, a notebook cell's change.                                                                                                                                                                    |
| `paths.ts`     | `relativeTo`: a path relative to the project root, on Windows too.                                                                                                                                                                            |
| `config.ts`    | The settings from `plugin.json`, with their defaults.                                                                                                                                                                                         |
| `draw.tsx`     | How a summary is drawn, given the elements of the surface.                                                                                                                                                                                    |
| `register.tsx` | The hooks: `session.start` registers `/diff-fold` and restores the choice, `command.run` switches it, `ui.render` on `ToolResult` draws the summary and, under the fullscreen layout, the **show diff** button.                               |

The loader lets a module hand `$` only to functions of the same file, so the split follows that line: the host stays in
`register.tsx`, the rest takes plain values.

## Rules a change keeps

- diff-fold draws only `ToolResult`. Tool rows, grouped rows and the area above the prompt belong to the engine and to other mods.
- Anything held for review (`staged`), failed, touching a sensitive file (`touchesSensitiveFile`), or expanded (`isExpanded`) is
  drawn by the engine. `isExpanded` counts on the main
  screen only: under the fullscreen layout the host reports rows as expanded that it draws folded.
- Every result of a folding tool leaves one line in the debug log: the tool, folded or in full and why, `isExpanded` and
  fullscreen. Never in the transcript, never a path or text from the result.
- The **show diff** button is drawn only under the fullscreen layout, the one surface that reports clicks, and has no hotkey.
  Opened, the result goes to the engine whole (`next(e)`), so the full diff is the engine's own drawing. Which rows are open is
  per row (`memberOf`) and per session.
- A Bash result is handed on to the engine without its `bashEditDiff`, so the command's own output is drawn as the engine draws it.
- `bashEditDiff` exists only when Claude Code records the changed files, which its setting `bashEditDiffEnabled` decides. A mod
  can't set it (user or managed settings only), so diff-fold documents it instead of switching it.
- A file without a diff is named from `bashEditDiff.changedFiles`, and no more of them than `moreFiles` counts. Measured with
  Claude Code 2.1.314: a binary file is in `changedFiles` and `moreFiles`, not in `files`; a file too large to diff sets
  `unavailable` and names nothing. Not every changed file is there: with Claude Code 2.1.316 a `sed -i` over a file whose name
  holds an escape character changed it, and `bashEditDiff` left it out of `files` and `moreFiles` alike, so the summary neither
  names nor counts it (measured). A mod sees only what the host reports.
- Every name in a summary goes through one gate in `summarize`, which writes control characters and bidi marks as `\xNN` or
  `\uNNNN`. Claude Code's own replacement of bidi marks with `�` in a mod's text is measured behaviour, not API, and says less.
- A NotebookEdit result carries `edit_mode` (`replace`, `insert`, `delete`), which the summary does not read. Measured with Claude
  Code 2.1.316: on `insert`, `cell_id` is the new cell's id, not the one it was inserted after, and `old_source` is absent; on
  `delete`, `old_source` holds the removed cell and `new_source` is empty. So both name the right cell, and the counts read
  `(+N −0)` and `(+0 −N)` under the verb `Changed`.
- State the drawing reads is in `$.state` (`types/index.d.ts`); the choice is also in `$.store`, so it outlives the session. The open rows are
  not stored.
