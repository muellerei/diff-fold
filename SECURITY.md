# Security

If you find a way to make diff-fold hide a change you should have seen, please don't post it in public. Use the repository's private report instead: the Security tab, "Report a vulnerability".

A report helps most when it says which Claude Code version you use, which tool made the change (Edit, Write, NotebookEdit or Bash), what diff-fold drew and what you expected. I read every report and answer it.

## What counts

diff-fold hides diffs, so the worst bug is a diff hidden where the README promises it in full. These are worth a report:

- a change to a sensitive file (secrets, what runs on its own such as CI workflows and git hooks, what steers Claude; the list is under [What it folds](README.md#what-it-folds)) is folded, alone or among the files of a Bash command
- an edit or write that is only proposed, and not yet written, is folded
- a summary line names other files or other counts than the change it stands for
- the mod reads or writes something beyond [What it can reach](README.md#what-it-can-reach)

A diff folded that you'd rather see, or one drawn in full that could be folded, is a bug too, but not a security one: an issue is the right place.

## Supported versions

Only the latest release gets fixes.

## Thanks

Reports made in good faith are welcome, and so is a "this looks odd, am I wrong?". You do not need a proof of concept.
