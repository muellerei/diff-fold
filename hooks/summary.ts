// What a hidden diff is summed up as: one line per changed file. Pure: no `$`, no host, so every rule here is
// tested without a session.

import { countCell, countHunks, firstChangedLine, linesOf, sum, type Change, type Hunk } from './counts'
import { relativeTo } from './paths'

export type FileLine = { verb: 'Changed' | 'Created' | 'Deleted'; where: string; change: Change }
// A Bash command that changed more files than are listed ends in one line that counts the rest.
export type Summary = { files: FileLine[]; more: number }

// A Bash command lists this many changed files; the rest are counted.
export const MAX_FILES = 3

type Patched = { filePath?: unknown; structuredPatch?: Hunk[]; gitDiff?: { additions: number; deletions: number }; staged?: boolean }
type Written = Patched & { type?: 'create' | 'update'; content?: string }
type Notebook = { notebook_path?: unknown; cell_id?: string; old_source?: string; new_source?: string; error?: string }
type ShellFile = { filePath: string; hunks?: Hunk[]; created?: true; deleted?: true }
type Shell = { bashEditDiff?: { files?: ShellFile[]; moreFiles?: number } }

// The tools whose result shows a diff that this mod can sum up.
export const TOOLS = ['Edit', 'Write', 'NotebookEdit', 'Bash'] as const

// The summary for a finished call's result, or undefined where the diff is drawn in full: another tool, a result of
// an unknown shape, a change held for review (the file is unchanged and the person has to see what is proposed), a
// failed notebook edit, and a change of `smallLines` lines or fewer.
export function summarize(tool: string, output: unknown, root: string, smallLines: number): Summary | undefined {
  if (typeof output !== 'object' || output === null) return undefined
  const isSmall = (change: Change) => change.added + change.removed <= smallLines
  const one = (line: FileLine | undefined) => (line && !isSmall(line.change) ? { files: [line], more: 0 } : undefined)

  switch (tool) {
    case 'Edit':
      return one(patchedLine(output as Patched, root))
    case 'Write': {
      const written = output as Written
      if (written.type !== 'create') return one(patchedLine(written, root))
      if (written.staged || typeof written.filePath !== 'string') return undefined
      return one({ verb: 'Created', where: relativeTo(written.filePath, root), change: { added: linesOf(written.content), removed: 0 } })
    }
    case 'NotebookEdit': {
      const notebook = output as Notebook
      if (notebook.error || typeof notebook.notebook_path !== 'string') return undefined
      const cell = notebook.cell_id ? ` cell ${notebook.cell_id}` : ''
      return one({ verb: 'Changed', where: relativeTo(notebook.notebook_path, root) + cell, change: countCell(notebook.old_source, notebook.new_source) })
    }
    case 'Bash':
      return shellSummary(output as Shell, root, isSmall)
    default:
      return undefined
  }
}

// An Edit, or a Write over an existing file.
function patchedLine(output: Patched, root: string): FileLine | undefined {
  if (output.staged || typeof output.filePath !== 'string') return undefined
  // An empty patch means the diff timed out or the file was too large to diff; git's counts stand in.
  const change =
    !output.structuredPatch?.length && output.gitDiff
      ? { added: output.gitDiff.additions, removed: output.gitDiff.deletions }
      : countHunks(output.structuredPatch)
  const line = firstChangedLine(output.structuredPatch)
  return { verb: 'Changed', where: relativeTo(output.filePath, root) + (line ? `:${line}` : ''), change }
}

// The files a shell command changed (sed -i, a heredoc, a generator), each on a line of its own. Judged small by the
// lines of all of them together, so a command that touched many files a little is still summed up.
function shellSummary(output: Shell, root: string, isSmall: (change: Change) => boolean): Summary | undefined {
  const files = output.bashEditDiff?.files ?? []
  if (files.length === 0) return undefined
  const lines: FileLine[] = files.map(file => {
    const line = file.created || file.deleted ? undefined : firstChangedLine(file.hunks)
    return {
      verb: file.created ? 'Created' : file.deleted ? 'Deleted' : 'Changed',
      where: relativeTo(file.filePath, root) + (line ? `:${line}` : ''),
      change: countHunks(file.hunks),
    }
  })
  if (isSmall(sum(lines.map(line => line.change)))) return undefined
  const shown = lines.slice(0, MAX_FILES)
  return { files: shown, more: lines.length - shown.length + (output.bashEditDiff?.moreFiles ?? 0) }
}

// A Bash result without the per-file diff, for the engine to draw the command's own output.
export function withoutEditDiff(output: unknown): unknown {
  if (typeof output !== 'object' || output === null) return output
  const { bashEditDiff: _, ...rest } = output as Record<string, unknown>
  return rest
}
