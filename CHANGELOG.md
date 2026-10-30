# Changelog

All notable changes to diff-fold. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- One summary line per file in place of the diff under Edit, Write, NotebookEdit and file-changing Bash calls, with the path
  relative to the project, the first changed line and the added and removed counts. Small diffs, diffs held for review, failed
  calls and the expanded transcript on the main screen stay in full.
- `/diff-fold` switches between summaries and full diffs; the choice is kept across sessions.
- Settings `smallDiffLines` and `icon`.
- One line per decision in the debug log (`--debug-file`): folded or in full, why, and the `isExpanded` and fullscreen values.

### Differences from hide-diffs, which diff-fold is derived from

- No line above the prompt. hide-diffs needs one: a key chord reaches only a button that is drawn. The switch here is a command,
  so nothing has to stay on screen.
- A Bash command that changed files lists each file (up to three, then a count) instead of `Changed 3 files`.
- The expanded transcript (ctrl+o, `--verbose`) shows every diff in full on the main screen; under the fullscreen layout the
  host reports rows as expanded that it draws folded, so there `/diff-fold` switches.
- A failed notebook edit keeps its result.
- Grouped tool rows, shell command rows and the session tally are left out: diff-fold draws only the result block of an edit.
