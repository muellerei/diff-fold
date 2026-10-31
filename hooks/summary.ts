// What a hidden diff is summed up as: one line per changed file. Pure: no `$`, no host, so every rule here is
// tested without a session.

import { countCell, countHunks, firstChangedLine, linesOf, placesOf, sum, type Change, type Hunk } from './counts'
import { relativeTo } from './paths'

// `change` is absent for a file the host changed but has no diff for (a binary one): it is named without counts.
// `places` is set only when the change is in more than one place, so the line in `where` does not read as the only one.
export type FileLine = { verb: 'Changed' | 'Created' | 'Deleted'; where: string; change?: Change; places?: number }
// A Bash command that changed more files than are listed ends in one line that counts the rest.
export type Summary = { files: FileLine[]; more: number }
// Why a result's diff stays in full, as the debug log names it.
export type Kept = 'held for review' | 'sensitive file' | 'failed' | 'small or no change' | 'no diff' | 'unknown result'

// A Bash command lists this many changed files; the rest are counted.
export const MAX_FILES = 3

type Patched = { filePath?: unknown; structuredPatch?: Hunk[]; gitDiff?: { additions: number; deletions: number }; staged?: boolean }
type Written = Patched & { type?: 'create' | 'update'; content?: string }
type Notebook = { notebook_path?: unknown; cell_id?: string; old_source?: string; new_source?: string; error?: string }
type ShellFile = { filePath: string; hunks?: Hunk[]; created?: true; deleted?: true }
// `changedFiles` names every file the command changed, those without a diff too (measured, Claude Code 2.1.314: a
// binary file is in it and counted in `moreFiles`, not in `files`).
type Shell = { bashEditDiff?: { files?: ShellFile[]; moreFiles?: number; changedFiles?: unknown[] } }

// The tools whose result shows a diff that this mod can sum up.
export const TOOLS = ['Edit', 'Write', 'NotebookEdit', 'Bash'] as const

// Files whose change is shown whole however large it is, because a summary line would hide what a change to them does:
// secrets and credentials (.env files, keys, .npmrc), what runs on its own (git's own files, CI configuration, MCP
// servers, plugin hooks) and what steers Claude Code, Claude or another agent (settings JSON, CLAUDE.md, AGENTS.md).
// Matched on the file name, so a folder named `.env` or a file `settings.ts` is folded as usual.
const SENSITIVE_NAME =
  /^(\.env.*|\.git.*|\.npmrc|\.netrc|\.pypirc|\.mcp\.json|hooks\.json|settings.*\.json|CLAUDE\.md|AGENTS\.md|.*\.(pem|key)|id_(rsa|ecdsa|ed25519).*)$/i
// The same for every file in these folders: git's own and its hooks, CI workflows and actions, SSH, and the parts of
// `.claude` that steer Claude. `.claude/plans`, `.claude/projects` and the like are Claude's own notes and are folded.
const SENSITIVE_DIR = /(^|\/)(\.git|\.husky|\.ssh|\.github\/(workflows|actions)|\.claude\/(agents|commands|skills|hooks|rules|output-styles))\//i

const isSensitive = (path: unknown) => {
  if (typeof path !== 'string') return false
  const slashed = path.replace(/\\/g, '/')
  return SENSITIVE_NAME.test(slashed.split('/').pop() ?? '') || SENSITIVE_DIR.test(slashed)
}

// Whether a result changed a sensitive file; for a shell command, any one of the files it changed.
function touchesSensitiveFile(tool: string, output: object): boolean {
  if (tool === 'Bash') return ((output as Shell).bashEditDiff?.files ?? []).some(file => isSensitive(file.filePath))
  return (tool === 'Edit' || tool === 'Write') && isSensitive((output as Patched).filePath)
}

// Characters that change how a line reads instead of being read: C0 and C1 controls with DEL (an escape sequence
// can recolour or move the cursor, a newline breaks the line) and the bidi marks, embeddings, overrides and
// isolates (a name holding U+202E, `report\u202efdp.ts`, reads as `reportst.pdf`). Claude Code 2.1.316 turned the
// bidi ones into U+FFFD in a mod's text before the terminal (measured), which hides that a name was dressed up
// and is behaviour no mod API promises. A backslash is not escaped: it separates Windows paths, so a name that
// spells `\x1b` itself reads the same.
const UNREADABLE = /[\x00-\x1f\x7f-\x9f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g

// `where` with every unreadable character written as `\xNN` or `\uNNNN`, the way the name really is.
function readable(where: string): string {
  return where.replace(UNREADABLE, char => {
    const code = char.charCodeAt(0)
    return code < 0x100 ? `\\x${code.toString(16).padStart(2, '0')}` : `\\u${code.toString(16).padStart(4, '0')}`
  })
}

// The summary for a finished call's result, or why its diff is drawn in full: another tool, a result of an unknown
// shape, a change held for review (the file is unchanged and the person has to see what is proposed), a change to a
// sensitive file, a failed notebook edit, and a change of `smallLines` lines or fewer. Every name in it is readable,
// whichever tool it came from.
export function summarize(tool: string, output: unknown, root: string, smallLines: number): Summary | Kept {
  const summary = summed(tool, output, root, smallLines)
  return typeof summary === 'string' ? summary : { ...summary, files: summary.files.map(file => ({ ...file, where: readable(file.where) })) }
}

function summed(tool: string, output: unknown, root: string, smallLines: number): Summary | Kept {
  if (typeof output !== 'object' || output === null) return 'unknown result'
  if (touchesSensitiveFile(tool, output)) return 'sensitive file'
  const isSmall = (change: Change) => change.added + change.removed <= smallLines
  const folded = (line: FileLine | Kept): Summary | Kept =>
    typeof line === 'string' ? line : line.change && !isSmall(line.change) ? { files: [line], more: 0 } : 'small or no change'

  switch (tool) {
    case 'Edit':
      return folded(patchedLine(output as Patched, root))
    case 'Write': {
      const written = output as Written
      if (written.type !== 'create') return folded(patchedLine(written, root))
      if (written.staged) return 'held for review'
      if (typeof written.filePath !== 'string') return 'unknown result'
      return folded({ verb: 'Created', where: relativeTo(written.filePath, root), change: { added: linesOf(written.content), removed: 0 } })
    }
    case 'NotebookEdit': {
      const notebook = output as Notebook
      if (notebook.error) return 'failed'
      if (typeof notebook.notebook_path !== 'string') return 'unknown result'
      const cell = notebook.cell_id ? ` cell ${notebook.cell_id}` : ''
      return folded({ verb: 'Changed', where: relativeTo(notebook.notebook_path, root) + cell, change: countCell(notebook.old_source, notebook.new_source) })
    }
    case 'Bash':
      return shellSummary(output as Shell, root, isSmall)
    default:
      return 'unknown result'
  }
}

// `path` relative to `root`, and the line the change starts at where there is one.
const located = (path: string, root: string, line: number | undefined) => relativeTo(path, root) + (line ? `:${line}` : '')

// The places of a patch, as a `FileLine` field when there are more than one.
const morePlaces = (hunks: readonly Hunk[] | undefined) => {
  const places = placesOf(hunks)
  return places > 1 ? { places } : {}
}

// An Edit, or a Write over an existing file.
function patchedLine(output: Patched, root: string): FileLine | Kept {
  if (output.staged) return 'held for review'
  if (typeof output.filePath !== 'string') return 'unknown result'
  // An empty patch means the diff timed out or the file was too large to diff; git's counts stand in.
  const change =
    !output.structuredPatch?.length && output.gitDiff
      ? { added: output.gitDiff.additions, removed: output.gitDiff.deletions }
      : countHunks(output.structuredPatch)
  const line = firstChangedLine(output.structuredPatch)
  return { verb: 'Changed', where: located(output.filePath, root, line), change, ...morePlaces(output.structuredPatch) }
}

// The files a shell command changed (sed -i, a heredoc, a generator), each on a line of its own. Judged small by the
// lines of all of them together, so a command that touched many files a little is still summed up.
function shellSummary(output: Shell, root: string, isSmall: (change: Change) => boolean): Summary | Kept {
  const files = output.bashEditDiff?.files ?? []
  if (files.length === 0) return 'no diff'
  const lines: FileLine[] = files.map(file => {
    const line = file.created || file.deleted ? undefined : firstChangedLine(file.hunks)
    return {
      verb: file.created ? 'Created' : file.deleted ? 'Deleted' : 'Changed',
      where: located(file.filePath, root, line),
      change: countHunks(file.hunks),
      ...morePlaces(file.hunks),
    }
  })
  // The files the host counted but has no diff for, named where `changedFiles` has them, no more than it counted.
  const moreFiles = output.bashEditDiff?.moreFiles ?? 0
  const listed = new Set(files.map(file => file.filePath))
  const unlisted = [...new Set(output.bashEditDiff?.changedFiles ?? [])].filter((path): path is string => typeof path === 'string' && !listed.has(path))
  const named = unlisted.slice(0, moreFiles)
  lines.push(...named.map(path => ({ verb: 'Changed' as const, where: relativeTo(path, root) })))
  if (isSmall(sum(lines.flatMap(line => line.change ?? [])))) return 'small or no change'
  const shown = lines.slice(0, MAX_FILES)
  return { files: shown, more: lines.length - shown.length + moreFiles - named.length }
}

// A Bash result without the per-file diff, for the engine to draw the command's own output.
export function withoutEditDiff(output: unknown): unknown {
  if (typeof output !== 'object' || output === null) return output
  const { bashEditDiff: _, ...rest } = output as Record<string, unknown>
  return rest
}
