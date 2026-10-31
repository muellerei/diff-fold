// Lines a change added and removed, counted from what the tools report. Pure: no `$`, no host.

export type Change = { added: number; removed: number }
export type Hunk = { newStart?: number; lines: readonly string[] }

export function countHunks(hunks: readonly Hunk[] = []): Change {
  let added = 0
  let removed = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith('+')) added += 1
      else if (line.startsWith('-')) removed += 1
    }
  }
  return { added, removed }
}

export function sum(changes: readonly Change[]): Change {
  return changes.reduce((total, change) => ({ added: total.added + change.added, removed: total.removed + change.removed }), { added: 0, removed: 0 })
}

// A line of a hunk that the patch added or removed, not context.
const isChange = (text: string) => text.startsWith('+') || text.startsWith('-')

// The line number, in the new file, of the first line the patch added or removed.
export function firstChangedLine(hunks: readonly Hunk[] = []): number | undefined {
  const hunk = hunks[0]
  if (!hunk?.newStart) return undefined
  let line = hunk.newStart
  for (const text of hunk.lines) {
    if (isChange(text)) return line
    line += 1
  }
  return undefined
}

// The hunks with an added or removed line: the places a patch changes. A hunk already joins changes whose context
// overlaps, so each one is a block of its own in the diff.
const changingHunks = (hunks: readonly Hunk[]) => hunks.filter(hunk => hunk.lines.some(isChange))

// How many places a patch changes.
export function placesOf(hunks: readonly Hunk[] = []): number {
  return changingHunks(hunks).length
}

// Whether every place a patch changes only moves whitespace: per hunk, the old side (context and removed lines) and the
// new side (context and added lines) read the same, line for line in order, once each line is trimmed and blank lines
// are left out. So indentation, tabs for spaces, trailing spaces and blank lines count. Whitespace inside a line does
// not, since it may sit in a string. Nor does a line break that moves: `// x` and `run()` drawn onto one line comment
// the call out, and two shell commands on one line are one command. Nor do lines that change places, since the context
// between them is compared too. Nor does a place where text spans lines, since there indentation is content: a
// template literal, a triple-quoted string, a heredoc, or a line continued with a backslash, after which a trailing
// space breaks the continuation. Any such marker anywhere in the hunk is enough, so `a << 2` or a backtick in a comment
// lose the note too; one that opens outside the hunk's context goes unseen. Which files this is asked for at all is
// up to the caller.
const SPANS_LINES = /`|"""|'''|<<|\\\s*$/

export function isWhitespaceOnly(hunks: readonly Hunk[] = []): boolean {
  const changing = changingHunks(hunks)
  const side = (hunk: Hunk, mark: string) =>
    hunk.lines
      .filter(text => text.startsWith(' ') || text.startsWith(mark))
      .map(text => text.slice(1).trim())
      .filter(text => text !== '')
      .join('\n')
  const spansLines = (hunk: Hunk) => hunk.lines.some(text => SPANS_LINES.test(text.slice(1)))
  return changing.length > 0 && changing.every(hunk => !spansLines(hunk) && side(hunk, '-') === side(hunk, '+'))
}

export function linesOf(text: string | undefined): number {
  const trimmed = (text ?? '').replace(/\n$/, '')
  return trimmed === '' ? 0 : trimmed.split('\n').length
}

// The lines found on only one side of a cell, counted as a multiset. NotebookEdit reports no patch, only the
// cell before and after; this is close enough for a summary and never claims an order.
export function countCell(before: string | undefined, after: string | undefined): Change {
  const remaining = new Map<string, number>()
  for (const line of before ? before.split('\n') : []) remaining.set(line, (remaining.get(line) ?? 0) + 1)
  let added = 0
  for (const line of after ? after.split('\n') : []) {
    const left = remaining.get(line) ?? 0
    if (left > 0) remaining.set(line, left - 1)
    else added += 1
  }
  let removed = 0
  for (const left of remaining.values()) removed += left
  return { added, removed }
}
