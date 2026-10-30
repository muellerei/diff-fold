import type { RenderElement } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine, TestBody } from 'claude-code/testing'

import { editOutput, shellFile } from './test-support'

type On = Parameters<TestBody>[1]

// The host beneath the mod: a root, a store, a command list, and an engine that draws every result as `full diff`,
// a shell result as its stdout, so a test sees whether the mod drew or left the drawing to the engine.
function host(on: On, { root = '/repo', stored }: { root?: string; stored?: boolean } = {}) {
  let currentRoot = root
  const logs: { text: string; to: string }[] = []
  on('ui.log', (_, e) => {
    logs.push({ text: e.text, to: e.to })
    return { value: undefined }
  })
  const store = new Map<string, unknown>(stored === undefined ? [] : [['isHiding', stored]])
  on('session.root', () => ({ value: currentRoot }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'diff-fold' } }))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const output = e.props.output as { stdout?: string; bashEditDiff?: unknown }
    const text = e.props.tool === 'Bash' ? `${output.stdout}${output.bashEditDiff ? ' with diff' : ''}` : 'full diff'
    return h($.ui.resolve(e).Text, {}, text) as RenderElement
  })
  return { store, logs, moveRoot: (to: string) => (currentRoot = to) }
}

const start = ($: Engine) => $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
const toggle = ($: Engine) => $.command.run({ command: 'diff-fold' } as never) as Promise<{ text?: string }>
const mount = ($: Engine, tool: string, output: unknown, props: Record<string, unknown> = {}, isFullscreen?: boolean) =>
  $.ui.mount({
    plugin: 'diff-fold',
    surface: 'terminal',
    component: 'ToolResult',
    props: { tool_use_id: 'r', tool, isErrored: false, output, ...props },
    ...(isFullscreen === undefined ? {} : { viewport: { columns: 120, rows: 40, isFullscreen } }),
  })
const texts = async (ui: Awaited<ReturnType<typeof mount>>) => (await ui.findAll({ type: 'Text' })).map(t => t.text)

test('a large edit becomes one line with its path, line and counts, added in green and removed in red', async ($, on) => {
  host(on)
  await start($)
  const ui = await mount($, 'Edit', editOutput('/repo/src/a.ts', 6))

  expect(await ui.find({ text: '🔶 Changed src/a.ts:12 (+6 −1)' })).toBeDefined()
  const all = await ui.findAll({ type: 'Text' })
  expect(all.find(t => t.text === '+6')?.props.color).toBe('success')
  expect(all.find(t => t.text === '−1')?.props.color).toBe('error')
  expect(await ui.find({ text: 'full diff' })).toBeUndefined()
})

test('a small edit, a failed one, and any result while ctrl+o shows all are left to the engine', async ($, on) => {
  host(on)
  await start($)
  for (const [output, props] of [
    [editOutput('/repo/a.ts', 1), {}],
    [editOutput('/repo/a.ts', 9), { isErrored: true }],
    [editOutput('/repo/a.ts', 9), { isExpanded: true }],
  ] as const) {
    const ui = await mount($, 'Edit', output, props)
    expect(await texts(ui)).toEqual(['full diff'])
    await ui.unmount()
  }
})

test(
  'the icon setting changes the mark, and empty leaves it out; smallDiffLines 0 sums up even one line',
  { options: { icon: '', smallDiffLines: 0 } },
  async ($, on) => {
    host(on)
    await start($)
    const ui = await mount($, 'Edit', editOutput('/repo/a.ts', 1))

    expect(await ui.find({ text: 'Changed a.ts:12 (+1 −1)' })).toBeDefined()
  },
)

test('a new file counts the lines it was written with', async ($, on) => {
  host(on)
  await start($)
  const content = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n') + '\n'
  const ui = await mount($, 'Write', { type: 'create', filePath: '/repo/new.ts', content, structuredPatch: [], originalFile: null })

  expect(await ui.find({ text: '🔶 Created new.ts (+20 −0)' })).toBeDefined()
})

test('a shell command keeps its own output, drawn without the diff, and lists each file it changed', async ($, on) => {
  host(on)
  await start($)
  const files = [shellFile('/repo/a.ts', 3), shellFile('/repo/b.ts', 3, { created: true }), shellFile('/repo/c.ts', 3), shellFile('/repo/d.ts', 3)]
  const ui = await mount($, 'Bash', { stdout: 'done', stderr: '', interrupted: false, bashEditDiff: { files, moreFiles: 0 } })

  expect(await texts(ui)).toContain('done')
  expect(await ui.find({ text: 'done with diff' })).toBeUndefined()
  expect(await ui.find({ text: '🔶 Changed a.ts:4 (+3 −0)' })).toBeDefined()
  expect(await ui.find({ text: '🔶 Created b.ts (+3 −0)' })).toBeDefined()
  expect(await ui.find({ text: '🔶 and 1 more file' })).toBeDefined()
})

test('the command switches to full diffs and back, says which, and keeps the choice in the store', async ($, on) => {
  const { store } = host(on)
  await start($)

  expect((await toggle($)).text).toBe('Diffs shown in full.')
  expect(store.get('isHiding')).toBe(false)
  const shown = await mount($, 'Edit', editOutput('/repo/a.ts', 9))
  expect(await texts(shown)).toEqual(['full diff'])
  await shown.unmount()

  expect((await toggle($)).text).toBe('Diffs hidden: each file edit shows one summary line.')
  expect(store.get('isHiding')).toBe(true)
  const hidden = await mount($, 'Edit', editOutput('/repo/a.ts', 9))
  expect(await hidden.find({ text: '🔶 Changed a.ts:12 (+9 −1)' })).toBeDefined()
})

test('a session starts with the choice an earlier one stored', async ($, on) => {
  host(on, { stored: false })
  await start($)
  const ui = await mount($, 'Edit', editOutput('/repo/a.ts', 9))

  expect(await texts(ui)).toEqual(['full diff'])
})

test('paths stay relative to the root the session started in, after the root moves', async ($, on) => {
  const { moveRoot } = host(on)
  await start($)
  moveRoot('/repo/sub')
  const ui = await mount($, 'Edit', editOutput('/repo/sub/a.ts', 9))

  expect(await ui.find({ text: '🔶 Changed sub/a.ts:12 (+9 −1)' })).toBeDefined()
})

test('under the fullscreen layout an edit is folded although the row is reported expanded', async ($, on) => {
  host(on)
  await start($)
  const folded = await mount($, 'Edit', editOutput('/repo/a.ts', 9), { isExpanded: true }, true)
  expect(await folded.find({ text: '🔶 Changed a.ts:12 (+9 −1)' })).toBeDefined()
  await folded.unmount()

  const shown = await mount($, 'Edit', editOutput('/repo/a.ts', 9), { isExpanded: true }, false)
  expect(await texts(shown)).toEqual(['full diff'])
})

test('each result of a folding tool leaves one line in the debug log with the decision and why, and no content', async ($, on) => {
  const { logs } = host(on)
  await start($)
  for (const [tool, output, props, isFullscreen] of [
    ['Edit', editOutput('/repo/a.ts', 9), {}, false],
    ['Edit', editOutput('/repo/a.ts', 1), {}, false],
    ['Edit', editOutput('/repo/a.ts', 9), { isExpanded: true }, false],
    ['Edit', editOutput('/repo/a.ts', 9), { isErrored: true }, true],
    ['Read', { file: 'x' }, {}, false],
  ] as const) {
    const ui = await mount($, tool, output, props, isFullscreen)
    await ui.unmount()
  }
  await toggle($)
  await (await mount($, 'Edit', editOutput('/repo/a.ts', 9))).unmount()

  expect(logs.every(l => l.to === 'debug')).toBe(true)
  expect([...new Set(logs.map(l => l.text))]).toEqual([
    'diff-fold: Edit folded, 1 file (isExpanded=false, fullscreen=false)',
    'diff-fold: Edit in full, small or no change (isExpanded=false, fullscreen=false)',
    'diff-fold: Edit in full, expanded (isExpanded=true, fullscreen=false)',
    'diff-fold: Edit in full, errored (isExpanded=false, fullscreen=true)',
    'diff-fold: Edit in full, switched off (isExpanded=false, fullscreen=false)',
  ])
})
