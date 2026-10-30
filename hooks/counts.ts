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

// The line number, in the new file, of the first line the patch added or removed.
export function firstChangedLine(hunks: readonly Hunk[] = []): number | undefined {
  const hunk = hunks[0]
  if (!hunk?.newStart) return undefined
  let line = hunk.newStart
  for (const text of hunk.lines) {
    if (text.startsWith('+') || text.startsWith('-')) return line
    line += 1
  }
  return undefined
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
