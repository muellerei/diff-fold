import { expect, test } from 'claude-code/testing'

import { MAX_FILES, summarize, withOnlyFiles, withoutEditDiff, type Kept, type Summary } from './summary'
import { editInPlaces, editOutput, shellFile } from './test-support'

const ROOT = '/repo'

// The summary a result folds to; fails the test where the diff stays in full.
function folded(result: Summary | Kept): Summary {
  if (typeof result === 'string') throw new Error(`in full: ${result}`)
  return result
}

test('Edit: the path relative to the root, the first changed line, and the counts', async () => {
  expect(summarize('Edit', editOutput('/repo/src/a.ts', 6), ROOT, 5)).toEqual({
    files: [{ verb: 'Changed', where: 'src/a.ts:12', change: { added: 6, removed: 1 } }],
    more: 0,
  })
})

test('Edit: a change of the small size or less is left whole; at 0 every change is summed up', async () => {
  expect(summarize('Edit', editOutput('/repo/a.ts', 4), ROOT, 5)).toBe('small or no change')
  expect(summarize('Edit', editOutput('/repo/a.ts', 5), ROOT, 5)).toHaveProperty('files')
  expect(summarize('Edit', editOutput('/repo/a.ts', 1), ROOT, 0)).toHaveProperty('files')
})

test('Edit: a change held for review is left whole, its diff is what the person has to judge', async () => {
  expect(summarize('Edit', editOutput('/repo/a.ts', 9, { staged: true }), ROOT, 5)).toBe('held for review')
})

test('Edit: an empty patch takes git counts, and then names no line', async () => {
  const output = editOutput('/repo/a.ts', 0, { structuredPatch: [], gitDiff: { additions: 40, deletions: 2 } })
  expect(folded(summarize('Edit', output, ROOT, 5)).files).toEqual([{ verb: 'Changed', where: 'a.ts', change: { added: 40, removed: 2 } }])
})

test('a change in more than one place counts its places, so the first line does not read as the only one', async () => {
  expect(folded(summarize('Edit', editInPlaces('/repo/a.ts', 3, 2), ROOT, 5)).files).toEqual([
    { verb: 'Changed', where: 'a.ts:12', change: { added: 6, removed: 3 }, places: 3 },
  ])
  const updated = { ...editInPlaces('/repo/old.ts', 2, 4), type: 'update', content: '' }
  expect(folded(summarize('Write', updated, ROOT, 5)).files[0]).toMatchObject({ where: 'old.ts:12', places: 2 })
  const file = { filePath: '/repo/b.ts', hunks: editInPlaces('/repo/b.ts', 2, 3).structuredPatch }
  expect(folded(summarize('Bash', { bashEditDiff: { files: [file], moreFiles: 0 } }, ROOT, 5)).files[0]).toMatchObject({ where: 'b.ts:12', places: 2 })
})

test('a change that moves only whitespace says so, for an edit, an overwrite and a shell command alike', async () => {
  const reindented = [{ newStart: 10, lines: [' a', '-  one()', '-  two()', '-  three()', '+    one()', '+    two()', '+    three()'] }]
  expect(folded(summarize('Edit', editOutput('/repo/a.ts', 0, { structuredPatch: reindented }), ROOT, 5)).files).toEqual([
    { verb: 'Changed', where: 'a.ts:11', change: { added: 3, removed: 3 }, whitespaceOnly: true },
  ])
  const updated = { ...editOutput('/repo/b.ts', 0, { structuredPatch: reindented }), type: 'update', content: '' }
  expect(folded(summarize('Write', updated, ROOT, 5)).files[0]).toMatchObject({ whitespaceOnly: true })
  const shell = { bashEditDiff: { files: [{ filePath: '/repo/c.ts', hunks: reindented }], moreFiles: 0 } }
  expect(folded(summarize('Bash', shell, ROOT, 5)).files[0]).toMatchObject({ whitespaceOnly: true })
  expect(folded(summarize('Edit', editOutput('/repo/a.ts', 6), ROOT, 5)).files[0]).not.toHaveProperty('whitespaceOnly')
})

test('a file in which whitespace carries meaning is never called whitespace only: Python, YAML, Makefile, Markdown and the like', async () => {
  const reindented = [{ newStart: 10, lines: [' a', '-  one()', '-  two()', '-  three()', '+    one()', '+    two()', '+    three()'] }]
  const names = [
    'a.py',
    'ci.YAML',
    'Makefile',
    'rules.mk',
    'README.md',
    'guide.rst',
    'data.tsv',
    'fix.patch',
    'Main.hs',
    'app.coffee',
    'view.pug',
    'style.sass',
  ]
  for (const name of names) {
    expect(folded(summarize('Edit', editOutput(`/repo/${name}`, 0, { structuredPatch: reindented }), ROOT, 5)).files[0], name).not.toHaveProperty(
      'whitespaceOnly',
    )
  }
  const shell = { bashEditDiff: { files: [{ filePath: '/repo/a.py', hunks: reindented }], moreFiles: 0 } }
  expect(folded(summarize('Bash', shell, ROOT, 5)).files[0]).not.toHaveProperty('whitespaceOnly')
  for (const name of ['py/a.ts', 'makefile.ts', 'notes.md/b.ts', 'style.scss']) {
    expect(folded(summarize('Edit', editOutput(`/repo/${name}`, 0, { structuredPatch: reindented }), ROOT, 5)).files[0], name).toMatchObject({
      whitespaceOnly: true,
    })
  }
})

test('a file a shell command created or deleted is never called whitespace only, blank lines or not', async () => {
  const blank = [{ newStart: 1, lines: ['+', '+'] }]
  const shell = { bashEditDiff: { files: [{ filePath: '/repo/c.txt', created: true, hunks: blank }], moreFiles: 0 } }
  expect(folded(summarize('Bash', shell, ROOT, 0)).files[0]).not.toHaveProperty('whitespaceOnly')
})

test('Write: a new file is Created with its line count; an overwrite is Changed like an edit', async () => {
  const created = { type: 'create', filePath: '/repo/new.ts', content: 'a\nb\nc\nd\ne\nf\n', structuredPatch: [], originalFile: null }
  expect(folded(summarize('Write', created, ROOT, 5)).files).toEqual([{ verb: 'Created', where: 'new.ts', change: { added: 6, removed: 0 } }])
  const updated = { ...editOutput('/repo/old.ts', 7), type: 'update', content: '' }
  expect(folded(summarize('Write', updated, ROOT, 5)).files).toEqual([{ verb: 'Changed', where: 'old.ts:12', change: { added: 7, removed: 1 } }])
})

test('Write: a write held for review is left whole, new file or not', async () => {
  expect(summarize('Write', { type: 'create', filePath: '/repo/n.ts', content: 'a\n'.repeat(9), staged: true }, ROOT, 5)).toBe('held for review')
  expect(summarize('Write', { ...editOutput('/repo/o.ts', 9), type: 'update', staged: true }, ROOT, 5)).toBe('held for review')
})

test('NotebookEdit: the notebook and its cell; a failed edit is left whole', async () => {
  const cell = { notebook_path: '/repo/n.ipynb', cell_id: 'c1', old_source: 'a', new_source: 'b\nc\nd\ne\nf\ng', edit_mode: 'replace' }
  expect(folded(summarize('NotebookEdit', cell, ROOT, 5)).files).toEqual([{ verb: 'Changed', where: 'n.ipynb cell c1', change: { added: 6, removed: 1 } }])
  expect(summarize('NotebookEdit', { ...cell, error: 'no such cell' }, ROOT, 5)).toBe('failed')
})

test('Bash: each changed file on its own line, created and deleted ones named so and without a line', async () => {
  const output = {
    stdout: '',
    bashEditDiff: {
      files: [shellFile('/repo/a.ts', 3), shellFile('/repo/b.ts', 3, { created: true }), shellFile('/repo/c.ts', 1, { deleted: true })],
      moreFiles: 0,
    },
  }
  expect(summarize('Bash', output, ROOT, 5)).toEqual({
    files: [
      { verb: 'Changed', where: 'a.ts:4', change: { added: 3, removed: 0 } },
      { verb: 'Created', where: 'b.ts', change: { added: 3, removed: 0 } },
      { verb: 'Deleted', where: 'c.ts', change: { added: 1, removed: 0 } },
    ],
    more: 0,
  })
})

test('Bash: the small size is judged on all files together', async () => {
  const two = (added: number) => ({ bashEditDiff: { files: [shellFile('/repo/a.ts', added), shellFile('/repo/b.ts', added)], moreFiles: 0 } })
  expect(summarize('Bash', two(2), ROOT, 5)).toBe('small or no change')
  expect(summarize('Bash', two(3), ROOT, 5)).toHaveProperty('files')
})

test(`Bash: past ${MAX_FILES} files the rest are counted, those the host left out of the diff too`, async () => {
  const files = Array.from({ length: MAX_FILES + 2 }, (_, i) => shellFile(`/repo/f${i}.ts`, 3))
  const summary = folded(summarize('Bash', { bashEditDiff: { files, moreFiles: 4 } }, ROOT, 5))
  expect(summary.files.map(file => file.where)).toEqual(['f0.ts:4', 'f1.ts:4', 'f2.ts:4'])
  expect(summary.more).toBe(6)
})

test('Bash: a file the host has no diff for (a binary one) is named from changedFiles, without counts', async () => {
  const output = { bashEditDiff: { files: [shellFile('/repo/a.ts', 9)], moreFiles: 1, changedFiles: ['/repo/bin.dat', '/repo/a.ts'] } }
  expect(summarize('Bash', output, ROOT, 5)).toEqual({
    files: [
      { verb: 'Changed', where: 'a.ts:4', change: { added: 9, removed: 0 } },
      { verb: 'Changed', where: 'bin.dat' },
    ],
    more: 0,
  })
})

test('Bash: no more files are named than the host counts, the rest stay counted, and the list keeps its limit', async () => {
  const fewer = { bashEditDiff: { files: [shellFile('/repo/a.ts', 9)], moreFiles: 1, changedFiles: ['/repo/x.bin', '/repo/y.bin', 7] } }
  expect(folded(summarize('Bash', fewer, ROOT, 5)).files.map(file => file.where)).toEqual(['a.ts:4', 'x.bin'])
  const unnamed = { bashEditDiff: { files: [shellFile('/repo/a.ts', 9)], moreFiles: 3, changedFiles: ['/repo/x.bin'] } }
  expect(summarize('Bash', unnamed, ROOT, 5)).toMatchObject({ more: 2 })
  const files = Array.from({ length: MAX_FILES }, (_, i) => shellFile(`/repo/f${i}.ts`, 3))
  const full = { bashEditDiff: { files, moreFiles: 2, changedFiles: ['/repo/x.bin', '/repo/y.bin'] } }
  expect(summarize('Bash', full, ROOT, 5)).toMatchObject({ more: 2 })
})

test('Bash: only files without a diff is no summary; the host draws that call itself', async () => {
  expect(summarize('Bash', { bashEditDiff: { files: [], moreFiles: 1, changedFiles: ['/repo/bin.dat'] } }, ROOT, 0)).toBe('no diff')
})

test('Bash: a command that changed no files, or whose diff the host skipped, is no summary', async () => {
  expect(summarize('Bash', { stdout: 'ok' }, ROOT, 0)).toBe('no diff')
  expect(summarize('Bash', { bashEditDiff: { files: [], moreFiles: 0, skipped: true } }, ROOT, 0)).toBe('no diff')
})

test('control and bidi characters in a name are shown escaped, so a name cannot pose as another or move the cursor', async () => {
  const where = (output: unknown, tool = 'Edit') => folded(summarize(tool, output, ROOT, 5)).files.map(file => file.where)
  expect(where(editOutput('/repo/report\u202efdp.ts', 6))).toEqual(['report\\u202efdp.ts:12'])
  expect(where(editOutput('/repo/a\u2066b\u200fc\u061cd.ts', 6))).toEqual(['a\\u2066b\\u200fc\\u061cd.ts:12'])
  expect(where({ bashEditDiff: { files: [shellFile('/repo/x\x1b[31mred.ts', 9)], moreFiles: 0 } }, 'Bash')).toEqual(['x\\x1b[31mred.ts:4'])
  expect(where({ bashEditDiff: { files: [shellFile('/repo/a.ts', 9)], moreFiles: 1, changedFiles: ['/repo/b\x7f\x9b.bin'] } }, 'Bash')).toEqual([
    'a.ts:4',
    'b\\x7f\\x9b.bin',
  ])
  const cell = { notebook_path: '/repo/n\n.ipynb', cell_id: 'c\r1', old_source: 'a', new_source: 'b\nc\nd\ne\nf\ng' }
  expect(where(cell, 'NotebookEdit')).toEqual(['n\\x0a.ipynb cell c\\x0d1'])
  expect(where({ type: 'create', filePath: '/repo/t\tab.ts', content: 'a\n'.repeat(9) }, 'Write')).toEqual(['t\\x09ab.ts'])
})

test('other characters in a name stay as they are: umlauts, CJK, emoji, a Windows path', async () => {
  const where = (path: string) => folded(summarize('Edit', editOutput(path, 6), 'C:\\repo', 5)).files[0]?.where
  expect(where('C:\\repo\\src\\Übersicht 日本 🔶.ts')).toBe('src\\Übersicht 日本 🔶.ts:12')
})

test('a sensitive file is left whole however large its change: .env files, settings JSON, CLAUDE.md, keys', async () => {
  for (const path of [
    '/repo/.env',
    '/repo/.env.local',
    '/repo/.claude/settings.json',
    '/repo/settings.local.json',
    '/repo/CLAUDE.md',
    '/repo/certs/server.pem',
    '/repo/tls.key',
    '/home/me/.ssh/id_ed25519',
  ]) {
    expect(summarize('Edit', editOutput(path, 9), ROOT, 5)).toBe('sensitive file')
  }
  expect(summarize('Write', { type: 'create', filePath: '/repo/.env', content: 'A=1\n'.repeat(9) }, ROOT, 5)).toBe('sensitive file')
})

test('also left whole: what runs on its own, what holds credentials, and what steers Claude or another agent', async () => {
  for (const path of [
    '/repo/.github/workflows/check.yml',
    '/repo/.github/actions/setup/action.yml',
    '/repo/.gitlab-ci.yml',
    '/repo/.husky/pre-commit',
    '/repo/.git/hooks/pre-push',
    '/repo/.gitattributes',
    '/repo/.gitmodules',
    '/home/me/.ssh/config',
    '/repo/.npmrc',
    '/home/me/.netrc',
    '/home/me/.pypirc',
    '/repo/.mcp.json',
    '/repo/hooks/hooks.json',
    '/repo/AGENTS.md',
    '/repo/.claude/agents/reviewer.md',
    '/repo/.claude/commands/ship.md',
    '/repo/.claude/skills/deploy/SKILL.md',
    '/repo/.claude/hooks/guard.sh',
    '/repo/.claude/rules/tests.md',
    '/repo/.claude/output-styles/terse.md',
    'C:\\repo\\.github\\workflows\\check.yml',
  ]) {
    expect(summarize('Edit', editOutput(path, 9), ROOT, 5)).toBe('sensitive file')
  }
})

test('also left whole: what runs as a side effect of installing, committing or opening the folder, and other agents\u2019 instructions', async () => {
  for (const path of [
    '/repo/package.json',
    '/repo/setup.py',
    '/repo/.pre-commit-config.yaml',
    '/repo/.pre-commit-config.yml',
    '/repo/lefthook.yml',
    '/repo/.lefthook.toml',
    '/repo/lefthook-local.jsonc',
    '/repo/.config/lefthook.yml',
    '/repo/mise.toml',
    '/repo/.mise.local.toml',
    '/repo/.vscode/tasks.json',
    '/repo/.devcontainer/devcontainer.json',
    '/repo/.devcontainer/Dockerfile',
    '/repo/.devcontainer.json',
    '/repo/GEMINI.md',
    '/repo/.github/copilot-instructions.md',
    '/repo/PACKAGE.JSON',
    'C:\\repo\\.vscode\\tasks.json',
  ]) {
    expect(summarize('Edit', editOutput(path, 9), ROOT, 5)).toBe('sensitive file')
  }
})

test('left out of the fixed list on purpose: configuration that runs nothing itself, lockfiles, look-alikes', async () => {
  for (const path of [
    '/repo/pyproject.toml',
    '/repo/tests/conftest.py',
    '/repo/package-lock.json',
    '/repo/tasks.json',
    '/repo/lefthookx.yml',
    '/repo/docs/copilot-instructions.md',
    '/repo/src/package.json.ts',
  ]) {
    expect(summarize('Edit', editOutput(path, 9), ROOT, 5)).toHaveProperty('files')
  }
})

test('NotebookEdit: a notebook in a sensitive folder is left whole, elsewhere it is folded', async () => {
  const notebook = (path: string) => ({ notebook_path: path, cell_id: 'c1', old_source: 'a', new_source: 'b\n'.repeat(9) })
  expect(summarize('NotebookEdit', notebook('/repo/.claude/skills/x/demo.ipynb'), ROOT, 5)).toBe('sensitive file')
  expect(summarize('NotebookEdit', notebook('/repo/notebooks/a.ipynb'), ROOT, 5)).toHaveProperty('files')
})

test('a folder or a look-alike name is folded as usual', async () => {
  for (const path of [
    '/repo/.env/notes.ts',
    '/repo/settings.ts',
    '/repo/docs/CLAUDE.md.bak',
    '/repo/keys/index.ts',
    '/repo/src/env.ts',
    '/repo/.github/ISSUE_TEMPLATE/bug_report.md',
    '/repo/src/hooks/useAgents.ts',
    '/repo/docs/agents/overview.md',
    '/home/me/.claude/plans/next-step.md',
    '/repo/my.github/workflows/x.yml',
  ]) {
    expect(summarize('Edit', editOutput(path, 9), ROOT, 5)).toHaveProperty('files')
  }
})

test('Bash: a sensitive file among others is left to the engine in full, the other files are summed up', async () => {
  const lock = shellFile('/repo/package-lock.json', 22, { created: true })
  const npm = {
    bashEditDiff: { files: [shellFile('/repo/package.json', 8), lock], moreFiles: 0, changedFiles: ['/repo/package.json', '/repo/package-lock.json'] },
  }
  expect(summarize('Bash', npm, ROOT, 5)).toEqual({
    files: [{ verb: 'Created', where: 'package-lock.json', change: { added: 22, removed: 0 } }],
    more: 0,
    fullPaths: ['/repo/package.json'],
    fullBecause: 'sensitive file',
  })
  const env = {
    bashEditDiff: { files: [shellFile('/repo/.env', 1), shellFile('/repo/a.ts', 9), shellFile('/repo/b.ts', 9), shellFile('/repo/c.ts', 9)], moreFiles: 0 },
  }
  const summary = folded(summarize('Bash', env, ROOT, 5))
  expect(summary.fullPaths).toEqual(['/repo/.env'])
  expect(summary.files.map(file => file.where)).toEqual(['a.ts:4', 'b.ts:4', 'c.ts:4'])
})

test('Bash: only sensitive files, or a small rest beside them, leave the whole diff in full', async () => {
  const sensitive = { bashEditDiff: { files: [shellFile('/repo/.env', 9), shellFile('/repo/package.json', 9)], moreFiles: 0 } }
  expect(summarize('Bash', sensitive, ROOT, 5)).toBe('sensitive file')
  const smallRest = { bashEditDiff: { files: [shellFile('/repo/.env', 9), shellFile('/repo/a.ts', 3)], moreFiles: 0 } }
  expect(summarize('Bash', smallRest, ROOT, 5)).toBe('small or no change')
  expect(summarize('Bash', { bashEditDiff: { files: [shellFile('/repo/a.ts', 9)] } }, ROOT, 5)).not.toHaveProperty('fullPaths')
})

test('withOnlyFiles keeps the shell result with the diff of just these files, as the engine draws a shorter list', async () => {
  const output = {
    stdout: 'ok',
    bashEditDiff: { files: [shellFile('/repo/.env', 1), shellFile('/repo/a.ts', 9)], moreFiles: 2, changedFiles: ['/repo/.env', '/repo/a.ts', '/repo/x.png'] },
  }
  expect(withOnlyFiles(output, ['/repo/.env'])).toEqual({
    stdout: 'ok',
    bashEditDiff: { files: [shellFile('/repo/.env', 1)], moreFiles: 0, changedFiles: ['/repo/.env'] },
  })
})

test('another tool, or a result that is no object, is no summary', async () => {
  expect(summarize('Read', editOutput('/repo/a.ts', 9), ROOT, 0)).toBe('unknown result')
  expect(summarize('Edit', 'Error: file not found', ROOT, 0)).toBe('unknown result')
  expect(summarize('Edit', null, ROOT, 0)).toBe('unknown result')
})

test('withoutEditDiff drops the diff and keeps the rest of a shell result', async () => {
  expect(withoutEditDiff({ stdout: 'ok', bashEditDiff: { files: [] } })).toEqual({ stdout: 'ok' })
  expect(withoutEditDiff('text')).toBe('text')
})
