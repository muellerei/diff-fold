# Changelog

All notable changes to diff-fold. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Control characters and bidi marks in a file name are shown escaped, as `\x1b` or `‮`. A name like `report‮fdp.ts`
  can no longer pose as `reportst.pdf`, and an escape sequence in a name can't recolour the line. Claude Code 2.1.316 already
  replaced the bidi marks with `�` before the terminal, so the line was not wrong, but `�` hides what the name holds, and that
  replacement is the host's own behaviour, not something the mod API promises (measured with a live session).

## [0.1.0] - 2026-10-31

### Added

- One summary line per file in place of the diff under Edit, Write, NotebookEdit and file-changing Bash calls, with the path
  relative to the project, the first changed line and the added and removed counts. A Bash call is judged small by all its files
  together. Small diffs, diffs held for review, failed calls and the expanded transcript on the main screen stay in full.
- Changes to sensitive files stay in full however large they are: secrets and credentials (`.env*`, `.npmrc`, `.netrc`,
  `.pypirc`, keys, `.ssh/`), what runs on its own (`.git*` files, `.git/`, `.husky/`, `.github/workflows/` and
  `.github/actions/`, `.mcp.json`, `hooks.json`) and what steers Claude or another agent (`settings*.json`, `CLAUDE.md`,
  `AGENTS.md`, and the agents, commands, skills, hooks, rules and output styles in `.claude/`), in any case. A summary line
  would hide what a change to them does. A Bash command that touched one of them keeps its whole diff; the debug log says
  `sensitive file`.
- A Bash call has a diff to fold only when Claude Code records the files it changed. Its setting `bashEditDiffEnabled`, in the
  user settings, turns that on in every permission mode; it is optional, and without it the call shows no diff (measured in the
  `acceptEdits` and `bypassPermissions` modes, Claude Code 2.1.314). The README explains it under "Bash commands".
- `/diff-fold` switches between summaries and full diffs; the choice is kept across sessions. If it cannot be saved, the switch
  still holds for the session and says so.
- Under the fullscreen layout, where ctrl+o keeps the summaries, a **▸ show diff** button under each summary opens that one diff
  in full and **▾ hide diff** folds it again. It has no hotkey, so it takes no key from another mod, and it is left out on the
  main screen: there a click does not reach it (measured, Claude Code 2.1.314) and ctrl+o shows every diff.
- Settings `smallDiffLines` and `icon`.
- One line per decision in the debug log (`--debug-file`): folded or in full, why, and the `isExpanded` and fullscreen values.

### Differences from hide-diffs, which diff-fold is derived from

- No line above the prompt. hide-diffs needs one: a key chord reaches only a button that is drawn. The switch here is a command,
  so nothing has to stay on screen.
- A Bash command that changed files lists each file (up to three, then a count) instead of `Changed 3 files`. A file Claude Code
  has no diff for, such as a binary one, is named with `(no diff)` next to the files that have one instead of being only
  counted.
- The expanded transcript (ctrl+o, `--verbose`) shows every diff in full on the main screen; under the fullscreen layout the
  host reports rows as expanded that it draws folded, so there a button opens one diff and `/diff-fold` switches all.
- A failed notebook edit keeps its result.
- Grouped tool rows, shell command rows and the session tally are left out: diff-fold draws only the result block of an edit.
