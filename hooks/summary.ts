// What a hidden diff is summed up as: one line per changed file. Pure: no `$`, no host, so every rule here is
// tested without a session.

import { countCell, countHunks, firstChangedLine, isWhitespaceOnly, linesOf, placesOf, sum, type Change, type Hunk } from './counts'
import { relativeTo } from './paths'

// `change` is absent for a file the host changed but has no diff for (a binary one): it is named without counts.
// `places` is set only when the change is in more than one place, so the line in `where` does not read as the only one.
// `whitespaceOnly` is set only when the change moves nothing but whitespace, so a reindent does not pass for an edit.
export type FileLine = { verb: 'Changed' | 'Created' | 'Deleted'; where: string; change?: Change; places?: number; whitespaceOnly?: true }
// A Bash command that changed more files than are listed ends in one line that counts the rest.
// A Bash command that changed a sensitive file among others also names the files whose diff the engine draws in full
// (`fullPaths`, as the host names them) and why (`fullBecause`); `files` and `more` count only the rest.
export type Summary = { files: FileLine[]; more: number; fullPaths?: string[]; fullBecause?: Kept }
// Why a result's diff stays in full, as the debug log names it.
export type Kept = 'held for review' | 'sensitive file' | 'kept by setting' | 'failed' | 'small or no change' | 'no diff' | 'unknown result'

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

// Files whose change is shown whole however large it is, because a summary line would hide what a change to them does.
// A file belongs here when a change to it acts without anyone reading it: it holds a secret (.env files, keys,
// .npmrc), it runs as a side effect of a routine command (installing: package.json scripts, setup.py; committing:
// git's own files, pre-commit, lefthook, husky; opening or entering the folder: VS Code tasks, dev containers, mise
// hooks; CI and MCP servers), or an agent reads it as instructions (settings JSON, CLAUDE.md, AGENTS.md, GEMINI.md,
// Copilot's instructions). Left out on purpose: configuration that runs nothing itself (pyproject.toml), code that runs
// only under the command it belongs to (conftest.py, like any test file), and lockfiles. What a project finds delicate
// beyond that is its own list to keep. Matched on the file name, so a folder named `.env` or a file `settings.ts` is
// folded as usual.
const SENSITIVE_NAME =
  /^(\.env.*|\.git.*|\.npmrc|\.netrc|\.pypirc|\.mcp\.json|hooks\.json|settings.*\.json|CLAUDE\.md|AGENTS\.md|GEMINI\.md|package\.json|setup\.py|\.pre-commit-config\.ya?ml|\.?lefthook(-local)?\.(ya?ml|toml|jsonc?)|\.?mise(\.local)?\.toml|\.devcontainer\.json|.*\.(pem|key)|id_(rsa|ecdsa|ed25519).*)$/i
// The same for every file in these folders: git's own and its hooks, CI workflows and actions, SSH, dev containers,
// and the parts of `.claude` that steer Claude. `.claude/plans`, `.claude/projects` and the like are Claude's own notes
// and are folded.
const SENSITIVE_DIR = /(^|\/)(\.git|\.husky|\.ssh|\.devcontainer|\.github\/(workflows|actions)|\.claude\/(agents|commands|skills|hooks|rules|output-styles))\//i
// And these files only in their folder: a `tasks.json` elsewhere is no VS Code task, a `copilot-instructions.md`
// elsewhere steers nothing.
const SENSITIVE_PATH = /(^|\/)(\.vscode\/tasks\.json|\.github\/copilot-instructions\.md)$/i

// Files in which whitespace carries meaning, so a change to it is never called whitespace only: indentation is structure
// (Python, YAML, CoffeeScript, Haskell, F#, Nim, Elm, Pug, Haml, Slim, Sass, Stylus), a tab is syntax or a separator
// (Makefile, TSV), spaces and blank lines are markup (Markdown, reStructuredText), or a leading space is a context line
// (patches). Matched on the file name like the list above. Not every such language is in it; one missing is called
// whitespace only as any other file is.
const WHITESPACE_MATTERS =
  /^((gnu)?makefile|.*\.(pyw?|pyi|ya?ml|coffee|l?hs|fsx?|fsi|nim|elm|pug|jade|haml|slim|sass|styl|mk|tsv|md|markdown|mdx|rst|diff|patch))$/i

const fileName = (path: string) => path.replace(/\\/g, '/').split('/').pop() ?? ''

const isSensitive = (path: unknown) => {
  if (typeof path !== 'string') return false
  const slashed = path.replace(/\\/g, '/')
  return SENSITIVE_NAME.test(fileName(slashed)) || SENSITIVE_DIR.test(slashed) || SENSITIVE_PATH.test(slashed)
}

// The files a result changed, as the host names them: one for Edit, Write and NotebookEdit, each file with a diff for a
// shell command. A Bash file without a diff (only in `changedFiles`) is left out: there is no diff to show in full.
function changedPaths(tool: string, output: object): unknown[] {
  if (tool === 'Bash') return ((output as Shell).bashEditDiff?.files ?? []).map(file => file.filePath)
  if (tool === 'NotebookEdit') return [(output as Notebook).notebook_path]
  return tool === 'Edit' || tool === 'Write' ? [(output as Patched).filePath] : []
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
// sensitive file, a file the keepFull setting names (`isKept`, asked with the path relative to `root`), a failed
// notebook edit, and a change of `smallLines` lines or fewer. Every name in it is readable, whichever tool it came from.
export function summarize(tool: string, output: unknown, root: string, smallLines: number, isKept: IsKept = () => false): Summary | Kept {
  const summary = summed(tool, output, root, smallLines, isKept)
  return typeof summary === 'string' ? summary : { ...summary, files: summary.files.map(file => ({ ...file, where: readable(file.where) })) }
}

type IsKept = (relativePath: string) => boolean

// Why a file stays in full, if it does. The fixed list is matched on the path as it comes, so `.ssh/` counts outside the
// project too; keepFull on the path inside the project, so `src/` does not match a parent folder that happens to be
// named `src`. Keep the two apart.
function fullReason(path: unknown, root: string, isKept: IsKept): Kept | undefined {
  if (isSensitive(path)) return 'sensitive file'
  return typeof path === 'string' && isKept(relativeTo(path, root)) ? 'kept by setting' : undefined
}

function summed(tool: string, output: unknown, root: string, smallLines: number, isKept: IsKept): Summary | Kept {
  if (typeof output !== 'object' || output === null) return 'unknown result'
  // A shell command can change a sensitive file among others; it is split per file in `shellSummary` instead.
  if (tool !== 'Bash') {
    const reason = changedPaths(tool, output)
      .map(path => fullReason(path, root, isKept))
      .find(Boolean)
    if (reason) return reason
  }
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
      return shellSummary(output as Shell, root, isSmall, isKept)
    default:
      return 'unknown result'
  }
}

// `path` relative to `root`, and the line the change starts at where there is one.
const located = (path: string, root: string, line: number | undefined) => relativeTo(path, root) + (line ? `:${line}` : '')

// What a patch's hunks add to its line as notes after the counts, as `FileLine` fields: its places when there are more
// than one, and whether it moves only whitespace, never in a file whose whitespace carries meaning. Only for a changed
// file: a created or deleted one has nothing to compare against.
const notesOf = (hunks: readonly Hunk[] | undefined, path: string) => {
  const places = placesOf(hunks)
  const whitespaceOnly = !WHITESPACE_MATTERS.test(fileName(path)) && isWhitespaceOnly(hunks)
  return { ...(places > 1 ? { places } : {}), ...(whitespaceOnly ? { whitespaceOnly: true as const } : {}) }
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
  return { verb: 'Changed', where: located(output.filePath, root, line), change, ...notesOf(output.structuredPatch, output.filePath) }
}

// The files a shell command changed (sed -i, a heredoc, a generator), each on a line of its own. Judged small by the
// lines of all of them together, so a command that touched many files a little is still summed up. A file that stays in
// full (sensitive, or named by keepFull) keeps its diff, drawn by the engine, and only the others are summed up: `npm
// install` changes package.json and the lockfile, and the lockfile's diff is no reason to show both in full. When every
// file stays in full, or the rest is small, the whole diff stays.
function shellSummary(output: Shell, root: string, isSmall: (change: Change) => boolean, isKept: IsKept): Summary | Kept {
  const all = output.bashEditDiff?.files ?? []
  if (all.length === 0) return 'no diff'
  const reasons = all.map(file => fullReason(file.filePath, root, isKept))
  const full = all.filter((_, i) => reasons[i])
  const fullBecause: Kept = reasons.includes('sensitive file') ? 'sensitive file' : 'kept by setting'
  if (full.length === all.length) return fullBecause
  const files = all.filter(file => !full.includes(file))
  const lines: FileLine[] = files.map(file => {
    const changed = !file.created && !file.deleted
    return {
      verb: file.created ? 'Created' : file.deleted ? 'Deleted' : 'Changed',
      where: located(file.filePath, root, changed ? firstChangedLine(file.hunks) : undefined),
      change: countHunks(file.hunks),
      ...(changed ? notesOf(file.hunks, file.filePath) : {}),
    }
  })
  // The files the host counted but has no diff for, named where `changedFiles` has them, no more than it counted.
  const moreFiles = output.bashEditDiff?.moreFiles ?? 0
  const listed = new Set(all.map(file => file.filePath))
  const unlisted = [...new Set(output.bashEditDiff?.changedFiles ?? [])].filter((path): path is string => typeof path === 'string' && !listed.has(path))
  const named = unlisted.slice(0, moreFiles)
  lines.push(...named.map(path => ({ verb: 'Changed' as const, where: relativeTo(path, root) })))
  if (isSmall(sum(lines.flatMap(line => line.change ?? [])))) return 'small or no change'
  const shown = lines.slice(0, MAX_FILES)
  const rest = { files: shown, more: lines.length - shown.length + moreFiles - named.length }
  return full.length ? { ...rest, fullPaths: full.map(file => file.filePath), fullBecause } : rest
}

// A Bash result with the diff of only these files, for the engine to draw them in full above the summary. The host
// draws such a shortened list as it is (measured, Claude Code 2.1.316); `moreFiles` is 0, since the summary counts the
// files it leaves out.
export function withOnlyFiles(output: unknown, paths: readonly string[]): unknown {
  if (typeof output !== 'object' || output === null) return output
  const shell = output as Shell
  const files = (shell.bashEditDiff?.files ?? []).filter(file => paths.includes(file.filePath))
  return { ...output, bashEditDiff: { ...shell.bashEditDiff, files, moreFiles: 0, changedFiles: files.map(file => file.filePath) } }
}

// A Bash result without the per-file diff, for the engine to draw the command's own output.
export function withoutEditDiff(output: unknown): unknown {
  if (typeof output !== 'object' || output === null) return output
  const { bashEditDiff: _, ...rest } = output as Record<string, unknown>
  return rest
}
