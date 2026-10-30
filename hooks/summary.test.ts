import { expect, test } from 'claude-code/testing'

import { MAX_FILES, summarize, withoutEditDiff } from './summary'
import { editOutput, shellFile } from './test-support'

const ROOT = '/repo'

test('Edit: the path relative to the root, the first changed line, and the counts', async () => {
  expect(summarize('Edit', editOutput('/repo/src/a.ts', 6), ROOT, 5)).toEqual({
    files: [{ verb: 'Changed', where: 'src/a.ts:12', change: { added: 6, removed: 1 } }],
    more: 0,
  })
})

test('Edit: a change of the small size or less is left whole; at 0 every change is summed up', async () => {
  expect(summarize('Edit', editOutput('/repo/a.ts', 4), ROOT, 5)).toBeUndefined()
  expect(summarize('Edit', editOutput('/repo/a.ts', 5), ROOT, 5)).toBeDefined()
  expect(summarize('Edit', editOutput('/repo/a.ts', 1), ROOT, 0)).toBeDefined()
})

test('Edit: a change held for review is left whole, its diff is what the person has to judge', async () => {
  expect(summarize('Edit', editOutput('/repo/a.ts', 9, { staged: true }), ROOT, 5)).toBeUndefined()
})

test('Edit: an empty patch takes git counts, and then names no line', async () => {
  const output = editOutput('/repo/a.ts', 0, { structuredPatch: [], gitDiff: { additions: 40, deletions: 2 } })
  expect(summarize('Edit', output, ROOT, 5)?.files).toEqual([{ verb: 'Changed', where: 'a.ts', change: { added: 40, removed: 2 } }])
})

test('Write: a new file is Created with its line count; an overwrite is Changed like an edit', async () => {
  const created = { type: 'create', filePath: '/repo/new.ts', content: 'a\nb\nc\nd\ne\nf\n', structuredPatch: [], originalFile: null }
  expect(summarize('Write', created, ROOT, 5)?.files).toEqual([{ verb: 'Created', where: 'new.ts', change: { added: 6, removed: 0 } }])
  const updated = { ...editOutput('/repo/old.ts', 7), type: 'update', content: '' }
  expect(summarize('Write', updated, ROOT, 5)?.files).toEqual([{ verb: 'Changed', where: 'old.ts:12', change: { added: 7, removed: 1 } }])
})

test('Write: a write held for review is left whole, new file or not', async () => {
  expect(summarize('Write', { type: 'create', filePath: '/repo/n.ts', content: 'a\n'.repeat(9), staged: true }, ROOT, 5)).toBeUndefined()
  expect(summarize('Write', { ...editOutput('/repo/o.ts', 9), type: 'update', staged: true }, ROOT, 5)).toBeUndefined()
})

test('NotebookEdit: the notebook and its cell; a failed edit is left whole', async () => {
  const cell = { notebook_path: '/repo/n.ipynb', cell_id: 'c1', old_source: 'a', new_source: 'b\nc\nd\ne\nf\ng', edit_mode: 'replace' }
  expect(summarize('NotebookEdit', cell, ROOT, 5)?.files).toEqual([{ verb: 'Changed', where: 'n.ipynb cell c1', change: { added: 6, removed: 1 } }])
  expect(summarize('NotebookEdit', { ...cell, error: 'no such cell' }, ROOT, 5)).toBeUndefined()
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
  expect(summarize('Bash', two(2), ROOT, 5)).toBeUndefined()
  expect(summarize('Bash', two(3), ROOT, 5)).toBeDefined()
})

test(`Bash: past ${MAX_FILES} files the rest are counted, those the host left out of the diff too`, async () => {
  const files = Array.from({ length: MAX_FILES + 2 }, (_, i) => shellFile(`/repo/f${i}.ts`, 3))
  const summary = summarize('Bash', { bashEditDiff: { files, moreFiles: 4 } }, ROOT, 5)
  expect(summary?.files.map(file => file.where)).toEqual(['f0.ts:4', 'f1.ts:4', 'f2.ts:4'])
  expect(summary?.more).toBe(6)
})

test('Bash: a command that changed no files, or whose diff the host skipped, is no summary', async () => {
  expect(summarize('Bash', { stdout: 'ok' }, ROOT, 0)).toBeUndefined()
  expect(summarize('Bash', { bashEditDiff: { files: [], moreFiles: 0, skipped: true } }, ROOT, 0)).toBeUndefined()
})

test('another tool, or a result that is no object, is no summary', async () => {
  expect(summarize('Read', editOutput('/repo/a.ts', 9), ROOT, 0)).toBeUndefined()
  expect(summarize('Edit', 'Error: file not found', ROOT, 0)).toBeUndefined()
  expect(summarize('Edit', null, ROOT, 0)).toBeUndefined()
})

test('withoutEditDiff drops the diff and keeps the rest of a shell result', async () => {
  expect(withoutEditDiff({ stdout: 'ok', bashEditDiff: { files: [] } })).toEqual({ stdout: 'ok' })
  expect(withoutEditDiff('text')).toBe('text')
})
